import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import { ItemFactory } from '../../../../items/application/services/item-factory.service.js';
import { ItemLedger } from '../../../../items/application/services/item-ledger.service.js';
import { skillBonus } from '../../../../items/application/services/skill-bonus.js';
import { UNUSUAL_EVENT_ROLL } from '../../../../items/application/services/item-maneuver.service.js';
import type { Item } from '../../../../items/domain/aggregates/item.js';
import type { ItemHerb } from '../../../../items/domain/value-objects/item-catalog-info.vo.js';
import type { ItemResponse } from '../../../../items/application/ports/item-client.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { HerbRules, type HerbSearchResult, rollD10 } from '../../../domain/services/healing/herb-rules.js';
import type { CharacterHP } from '../../../domain/value-objects/character-hp.vo.js';
import { type ManeuverClientPort, MANEUVER_CLIENT } from '../../ports/maneuver-client.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { HerbInventory } from '../../services/herb-inventory.service.js';
import { SearchHerbsCommand, UseHerbCommand } from '../commands/herb.commands.js';

/** Absolute maneuver table of core used by a herb search. */
export const HERB_SEARCH_TABLE = 'generic';
/** Herbs of one search. */
export const MAX_HERBS_PER_SEARCH = 20;

export interface UseHerbResult {
  healed: number;
  /** Hits restored by the herb before the maximum: the roll, or the one rolled in its range. */
  roll: number;
  hp: CharacterHP;
  /** The herb after the dose (null when it was the last one). */
  item: Item | null;
  character: Character;
}

/**
 * A dose of a healing herb out of combat (workspace spec 062): the herb of the character with `effects.heal` heals
 * the roll (or a roll in its range), up to the maximum hits, and one dose is spent. Stun relief is tactical only.
 */
@CommandHandler(UseHerbCommand)
export class UseHerbHandler implements ICommandHandler<UseHerbCommand, UseHerbResult> {
  constructor(
    private readonly store: CharacterHealthStore,
    private readonly herbs: HerbInventory,
  ) {}

  async execute(command: UseHerbCommand): Promise<UseHerbResult> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const held = await this.herbs.load(command.itemId, character);
    const range = HerbRules.healRange(held.herb.effects);
    const roll = command.roll ?? HerbRules.rollHeal(range);
    const healed = character.healWithHerb(roll, { itemId: held.item.id, itemTypeId: held.item.itemTypeId, name: held.item.name, roll });
    const saved = await this.store.save(character);
    const item = await this.herbs.spendDose(held, 'herb-use', command.userId);
    return { healed, roll, hp: saved.hp, item, character: saved };
  }
}

/** One herb of a search. */
export interface HerbSearchHerbResult {
  itemTypeId: string;
  name: string;
  /** Find code of the herb. */
  difficulty: string | null;
  /** What the herb adds to the base: its difficulty, the repeated searches and the several herbs penalty. */
  modifiers: { key: string; value: number }[];
  total: number;
  /** Result of the absolute maneuver of core (none when the herb does not grow here). */
  maneuverResult?: string;
  result: HerbSearchResult;
  /** The d10 of the doses, when found. */
  d10?: number;
  doses: number;
  /** The items the doses went to. */
  itemIds: string[];
}

export interface HerbSearchOutcome {
  biome: string;
  highAltitude: boolean;
  skillId: string;
  /** Roll, skill bonus and the modifiers of the client. */
  roll: number;
  bonus: number;
  modifiers: { key: string; value: number }[];
  base: number;
  /** Hours of the search (10, 5 in a familiar area): the campaign clock does not advance. */
  hours: number;
  unusualEvent?: boolean;
  herbs: HerbSearchHerbResult[];
  items: Item[];
}

/**
 * A search for herbs (workspace spec 062, Treasure Law 2.3): an absolute maneuver of Perception or Survival per herb,
 * with its Find difficulty, -10 per previous search and the several herbs penalty. A herb that does not grow in the
 * biome (or altitude) is not here. The doses found (1d10, +1 per full 10 over 100) go to the character for free.
 */
@CommandHandler(SearchHerbsCommand)
export class SearchHerbsHandler implements ICommandHandler<SearchHerbsCommand, HerbSearchOutcome> {
  constructor(
    private readonly store: CharacterHealthStore,
    private readonly itemFactory: ItemFactory,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
    @Inject(MANEUVER_CLIENT) private readonly maneuvers: ManeuverClientPort,
  ) {}

  async execute(command: SearchHerbsCommand): Promise<HerbSearchOutcome> {
    const { request } = command;
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const ids = request.herbItemTypeIds;
    if (ids.length === 0 || ids.length > MAX_HERBS_PER_SEARCH || new Set(ids).size !== ids.length) {
      throw new ValidationError(`From 1 to ${MAX_HERBS_PER_SEARCH} different herbs`, 'err-herb-search-invalid');
    }
    const types: { itemType: ItemResponse; herb: ItemHerb }[] = [];
    for (const id of ids) {
      const itemType = await this.itemFactory.itemType(id);
      const herb = itemType.features?.herb;
      if (itemType.category !== 'herb' || !herb) throw new ValidationError(`Item type ${id} is not a herb`, 'err-item-not-herb');
      types.push({ itemType, herb });
    }
    const bonus = request.bonus ?? skillBonus(character, request.skillId, request.specialization);
    if (bonus === undefined) {
      throw new ValidationError('The skill bonus is unknown: choose a skill of the character or type it', 'err-item-skill-required');
    }
    const modifiers = request.modifiers.filter(modifier => modifier.value !== 0);
    const base = request.roll + bonus + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    const unusualEvent = request.unmodifiedRoll === UNUSUAL_EVENT_ROLL;
    const maneuvers = HerbRules.maneuvers(
      types.map(({ itemType, herb }) => ({ itemTypeId: itemType.id, herb })),
      { biome: request.biome, highAltitude: request.highAltitude, base, previousSearches: request.previousSearches },
    );

    const herbs: HerbSearchHerbResult[] = [];
    const items: Item[] = [];
    for (const [index, maneuver] of maneuvers.entries()) {
      const { itemType } = types[index];
      const result: HerbSearchHerbResult = {
        itemTypeId: itemType.id,
        name: itemType.name ?? itemType.id,
        difficulty: maneuver.difficulty,
        modifiers: maneuver.modifiers,
        total: maneuver.total,
        result: 'not-here',
        doses: 0,
        itemIds: [],
      };
      herbs.push(result);
      if (!maneuver.here) continue;
      const response = await this.maneuvers.absolute(maneuver.total, HERB_SEARCH_TABLE, unusualEvent);
      result.maneuverResult = response.result;
      result.result = HerbRules.result(response.result);
      if (result.result !== 'found') continue;
      result.d10 = rollD10();
      result.doses = HerbRules.doses(maneuver.total, result.d10);
      const added = await this.addDoses(character, itemType, result.doses, command.userId);
      result.itemIds = added.map(item => item.id);
      items.push(...added);
    }
    if (items.length > 0) await this.inventorySync.refresh({ kind: 'character', id: character.id });
    return {
      biome: request.biome,
      highAltitude: request.highAltitude,
      skillId: request.skillId,
      roll: request.roll,
      bonus,
      modifiers,
      base,
      hours: HerbRules.hours(request.familiar),
      ...(unusualEvent ? { unusualEvent: true } : {}),
      herbs,
      items,
    };
  }

  /** The doses as items of the character, free: one stack, or one item per dose of a type that does not stack. */
  private async addDoses(character: Character, itemType: ItemResponse, doses: number, userId: string): Promise<Item[]> {
    const stackable = !!itemType.info.stackable;
    const stored: Item[] = [];
    for (let index = 0; index < (stackable ? 1 : doses); index++) {
      const item = this.itemFactory.build(itemType, {
        gameId: character.gameId,
        holder: { kind: 'character', id: character.id },
        character,
        amount: stackable ? doses : 1,
        acquiredPrice: 0,
        owner: userId,
      });
      stored.push((await this.itemFactory.store(item)).item);
    }
    await this.ledger.record({
      gameId: character.gameId,
      kind: 'found',
      itemId: stored[0].id,
      itemIds: stored.map(item => item.id),
      itemTypeId: itemType.id,
      itemName: stored[0].name,
      amount: doses,
      from: null,
      to: { kind: 'character', id: character.id },
      note: 'herb-search',
      userId,
    });
    return stored;
  }
}
