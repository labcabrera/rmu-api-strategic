import { Inject, Injectable } from '@nestjs/common';
import { KnownSpellsReader } from '../../../characters/application/services/known-spells.reader.js';
import { realmStatBonus } from '../../../characters/domain/services/realms-rules.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { type HolderContext, HolderAccess } from '../../../items/application/services/holder-access.service.js';
import type { Item } from '../../../items/domain/aggregates/item.js';
import { CraftingPlanner } from '../../../items/domain/services/crafting-plan.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { EnchantmentRequest } from '../../domain/aggregates/enchantment-project.js';
import { type EnchantmentPlan, EnchantmentPlanner, type EnchantmentPlannerSpell } from '../../domain/services/enchantment-planner.js';
import type { EnchantedItemInfo } from '../../domain/services/enchantment-outcome.js';
import {
  type AlchemyTables,
  DEFAULT_POWER_LEVEL,
  findFailureRow,
  type AlchemyFailureRow,
  type AlchemyFailureTable,
  type PowerLevel,
  type SpellAlchemy,
} from '../../domain/value-objects/alchemy.vo.js';
import { ALCHEMY_TABLES_CLIENT, type AlchemyTablesClientPort } from '../ports/alchemy-tables-client.port.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../ports/enchantment-repository.port.js';

/** Multiplier of the power level the book takes as the base, used when core has no power levels. */
const BASE_POWER_LEVEL: PowerLevel = 'superior';

/** Everything a quote or a start needs, checked. */
export interface EnchantmentContext {
  alchemist: HolderContext & { character: NonNullable<HolderContext['character']> };
  item: Item;
  itemHolder: HolderContext;
  plan: EnchantmentPlan;
  tables: AlchemyTables | null;
}

/**
 * Builds the plan of an enchantment from the request (workspace spec 064, decision 6): the alchemist and the item, the
 * spells it knows in its grimoire (spec 029) with their SCR modifiers, the alchemy tables of core and the planner.
 */
@Injectable()
export class EnchantmentPlanning {
  constructor(
    private readonly holderAccess: HolderAccess,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ENCHANTMENT_REPOSITORY) private readonly enchantmentRepository: EnchantmentRepository,
    private readonly knownSpells: KnownSpellsReader,
    @Inject(ALCHEMY_TABLES_CLIENT) private readonly alchemyTables: AlchemyTablesClientPort,
  ) {}

  async prepare(request: EnchantmentRequest, userId: string, roles: string[]): Promise<EnchantmentContext> {
    const spellIds = (request.spells ?? []).map(spell => spell.spellId);
    if (new Set(spellIds).size !== spellIds.length) {
      throw new ValidationError('A spell can only be listed once in an enchantment', 'err-enchantment-spell-repeated');
    }

    const alchemist = await this.holderAccess.load({ kind: 'character', id: request.alchemistId });
    await this.holderAccess.checkManage(alchemist, userId, roles);
    const item = await this.itemRepository.findById(request.itemId);
    if (!item) throw new NotFoundError('Item', request.itemId, 'err-item-not-found');
    const itemHolder = await this.holderAccess.load(item.holder);
    this.holderAccess.checkSameGame(alchemist, itemHolder);
    await this.holderAccess.checkManage(itemHolder, userId, roles);
    if (item.enchantment) throw new ConflictError(`Item ${item.id} is already enchanted`, 'err-enchantment-item-enchanted');
    if (await this.enchantmentRepository.findActiveByItemId(item.id)) {
      throw new ConflictError(`Item ${item.id} is in another enchantment project`, 'err-enchantment-item-busy');
    }

    // The whole item is enchanted: a batch is a stack of exactly that many units
    const batchSize = request.batchSize ?? 1;
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize !== item.units) {
      throw new ValidationError(
        `A batch of ${batchSize} needs an item of as many units (it has ${item.units})`,
        'err-enchantment-batch-invalid',
      );
    }

    const character = alchemist.character!;
    const lists = await this.knownSpells.read(character);
    const realmStat = realmStatBonus(character.info, character.statistics);
    const spells: EnchantmentPlannerSpell[] = (request.spells ?? []).map(requested => {
      const list = lists.find(candidate => candidate.spells.some(known => known.spell.id === requested.spellId));
      const known = list?.spells.find(candidate => candidate.spell.id === requested.spellId);
      if (!list || !known) {
        throw new ValidationError(`The alchemist does not know spell ${requested.spellId}`, 'err-enchantment-spell-unknown');
      }
      const spell = known.spell;
      const modifiers = (spell.modifiers ?? {}) as { type?: string | null };
      return {
        spellId: spell.id,
        name: spell.name,
        level: spell.level,
        listId: list.spellListId ?? spell.spellListId,
        listCode: list.code,
        listSkillId: list.skillId,
        type: modifiers.type ?? null,
        scope: requested.scope ?? 'normal',
        target: requested.target ?? null,
        alchemy: (spell.alchemy as SpellAlchemy | null | undefined) ?? null,
        scrModifiers: [
          { key: 'ranks', value: list.ranks },
          { key: 'realm-stat', value: realmStat },
          { key: 'list-type', value: list.listTypeModifier },
        ],
      };
    });

    const tables = await this.alchemyTables.getAlchemyTables();
    const powerLevel = request.powerLevel ?? DEFAULT_POWER_LEVEL;
    const plan = EnchantmentPlanner.plan({
      spells,
      batchSize,
      powerLevel,
      powerMultiplier: this.powerMultiplier(tables, powerLevel),
      materialBonus: EnchantmentPlanning.itemInfo(item).reducesDays ? (item.material?.bonus ?? 0) : 0,
      baseValue: item.unitValue * batchSize,
      alchemistPP: character.power?.max ?? null,
    });
    return { alchemist: alchemist as EnchantmentContext['alchemist'], item, itemHolder, plan, tables };
  }

  /** The failure row of a result, from the tables of core (null when they are not imported). */
  static failureLookup(tables: AlchemyTables | null): (table: AlchemyFailureTable, result: number) => AlchemyFailureRow | null {
    return (table, result) => findFailureRow(tables?.failureTables?.[table], result);
  }

  async failureLookup(): Promise<(table: AlchemyFailureTable, result: number) => AlchemyFailureRow | null> {
    return EnchantmentPlanning.failureLookup(await this.alchemyTables.getAlchemyTables());
  }

  /**
   * The material bonus of an item, the use it applies to, and whether it takes days off: weapons, ammunition,
   * launchers, armor and shields (the CraftKind of workspace spec 043).
   */
  static itemInfo(item: Item): EnchantedItemInfo & { reducesDays: boolean } {
    const kind = CraftingPlanner.kind({
      category: item.category,
      weapon: item.weapon ? { skillId: item.weapon.skillId } : null,
      armor: item.armor ? { slot: item.armor.slot } : null,
      shield: item.shield,
    });
    return {
      reducesDays: kind !== 'other',
      materialBonus: item.material?.bonus ?? 0,
      materialTarget: item.material ? CraftingPlanner.bonusTarget(kind) : null,
    };
  }

  private powerMultiplier(tables: AlchemyTables | null, powerLevel: PowerLevel): number {
    const value = tables?.powerLevels?.[powerLevel];
    if (typeof value === 'number' && value > 0) return value;
    if (powerLevel === BASE_POWER_LEVEL) return 1;
    throw new ValidationError(`Core has no multiplier for the power level ${powerLevel}`, 'err-enchantment-power-level-unknown');
  }
}
