import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SPELL_LIST_CLIENT, type SpellListClientPort } from '../../../../characters/application/ports/spell-list-client.port.js';
import { type ItemClientPort, ITEM_CLIENT } from '../../../../items/application/ports/item-client.port.js';
import { type ItemGuardPort, ITEM_GUARD } from '../../../../items/application/ports/item-guard.port.js';
import { TREASURE_TABLES_CLIENT, type TreasureTablesClientPort } from '../../../../items/application/ports/treasure-tables-client.port.js';
import { HolderAccess } from '../../../../items/application/services/holder-access.service.js';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import { ItemFactory } from '../../../../items/application/services/item-factory.service.js';
import { ItemLedger } from '../../../../items/application/services/item-ledger.service.js';
import { MagicItems } from '../../../../items/application/services/magic-items.service.js';
import { Wallet } from '../../../../items/application/services/wallet.service.js';
import type { Item } from '../../../../items/domain/aggregates/item.js';
import type { LedgerPayment } from '../../../../items/domain/aggregates/item-ledger-entry.js';
import { roundGold } from '../../../../items/domain/services/price-calculator.js';
import type { ItemSize } from '../../../../items/domain/services/item-unit-value.js';
import type { TreasureTables } from '../../../../items/domain/value-objects/treasure-tables.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { DICE, type Dice } from '../../../domain/services/dice.js';
import {
  parseTreasureCodes,
  type TreasureCatalog,
  TreasureGenerator,
  type TreasureItemLine,
  type TreasureRoll,
} from '../../../domain/services/treasure-generator.js';
import { AwardTreasureCommand, RollTreasureQuery } from '../commands/treasure.commands.js';

/** Lines of one award. */
export const MAX_AWARD_LINES = 200;

/**
 * Rolls a random treasure on the server (workspace spec 067, decisions 10-15): the codes of the book are combined with
 * the qualities given by hand, and the result carries every die. Nothing is stored.
 */
@QueryHandler(RollTreasureQuery)
export class RollTreasureHandler implements IQueryHandler<RollTreasureQuery, TreasureRoll> {
  constructor(
    @Inject(TREASURE_TABLES_CLIENT) private readonly treasureTables: TreasureTablesClientPort,
    @Inject(ITEM_CLIENT) private readonly itemClient: ItemClientPort,
    @Inject(SPELL_LIST_CLIENT) private readonly spellListClient: SpellListClientPort,
    @Inject(DICE) private readonly dice: Dice,
  ) {}

  async execute(query: RollTreasureQuery): Promise<TreasureRoll> {
    const tables = await this.treasureTables.getTreasureTables();
    if (!tables) throw new ValidationError('Core has no treasure tables imported', 'err-treasure-tables-missing');
    const { request } = query;
    const parsed = parseTreasureCodes(request.codes, tables.codes ?? { wealth: {}, lifestyle: {}, magic: {} });
    const codes = {
      wealth: [...parsed.codes.wealth, ...(request.wealth ?? [])],
      lifestyle: [...parsed.codes.lifestyle, ...(request.lifestyle ?? [])],
      magic: [...parsed.codes.magic, ...(request.magic ?? [])],
    };
    const generator = new TreasureGenerator(tables, this.catalog(), this.dice);
    return generator.generate({
      codes,
      wealthModifier: RollTreasureHandler.wealthModifier(request.wealthModifier, request.powerLevel, tables),
      notes: parsed.notes,
      warnings: parsed.warnings,
    });
  }

  static wealthModifier(modifier: number | undefined, powerLevel: string | null | undefined, tables: TreasureTables): number {
    const power = powerLevel ? (tables.wealthValueModifiers ?? []).find(row => row.key === `power-${powerLevel}`)?.value : undefined;
    return (modifier ?? 0) + (power ?? 0);
  }

  private catalog(): TreasureCatalog {
    return {
      itemType: id => this.itemClient.getItemById(id),
      spells: async (listCode, level) => {
        const list = await this.spellListClient.getSpellListByCode(listCode);
        if (!list) return [];
        const spells = await this.spellListClient.getSpellsByListId(list.id);
        return spells.filter(spell => spell.level === level).map(spell => ({ name: spell.name, level: spell.level }));
      },
    };
  }
}

/**
 * The game master gives the chosen lines of a treasure to a faction or a character (workspace spec 067, decision 16):
 * gold to its wallet, items with no acquired price, magic items with their enchantment. All or none: what was created
 * is undone when a line fails. Ledger `treasure`.
 */
@CommandHandler(AwardTreasureCommand)
export class AwardTreasureHandler implements ICommandHandler<AwardTreasureCommand, { items: Item[]; gold: number }> {
  constructor(
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    private readonly holderAccess: HolderAccess,
    private readonly itemFactory: ItemFactory,
    private readonly magicItems: MagicItems,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: AwardTreasureCommand): Promise<{ items: Item[]; gold: number }> {
    const { userId, roles } = command;
    this.itemGuard.checkCreate(roles);
    if (command.lines.length > MAX_AWARD_LINES) {
      throw new ValidationError(`An award has up to ${MAX_AWARD_LINES} lines`, 'err-treasure-award-invalid');
    }
    const holder = await this.holderAccess.load(command.holder);
    if (command.gameId && command.gameId !== holder.gameId) {
      throw new ValidationError('The holder is not in this game', 'err-item-other-game');
    }
    await this.holderAccess.checkManage(holder, userId, roles);

    const gold = roundGold(command.lines.reduce((sum, line) => sum + (line.kind === 'gold' ? line.gold : 0), 0));
    if (command.lines.some(line => line.kind === 'gold' && !(line.gold >= 0))) {
      throw new ValidationError('The gold of a line cannot be negative', 'err-treasure-award-invalid');
    }
    const stored: { stored: { item: Item; merged: boolean }; units: number }[] = [];
    let payments: LedgerPayment[] = [];
    try {
      for (const line of command.lines) {
        if (line.kind !== 'item') continue;
        const item = await this.build(line, holder, userId);
        stored.push({ stored: await this.itemFactory.store(item), units: item.units });
      }
      if (gold > 0) payments = [await this.wallet.credit(holder, gold)];
    } catch (e) {
      for (const done of stored.reverse()) await this.itemFactory.unstore(done.stored, done.units);
      throw e;
    }
    const items = stored.map(done => done.stored.item);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'treasure',
      itemId: items[0]?.id ?? null,
      itemIds: items.map(item => item.id),
      itemTypeId: null,
      itemName: null,
      amount: null,
      from: null,
      to: holder.holder,
      payments,
      userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return { items, gold };
  }

  private async build(line: TreasureItemLine, holder: Awaited<ReturnType<HolderAccess['load']>>, userId: string): Promise<Item> {
    if (!(line.value >= 0)) throw new ValidationError('The value of a line cannot be negative', 'err-treasure-award-invalid');
    if (line.magic) {
      const prepared = await this.magicItems.prepare({ ...line.magic, price: line.magic.price ?? line.value });
      return this.magicItems.build(prepared, holder, {
        source: 'treasure',
        acquiredPrice: 0,
        owner: userId,
        amount: line.amount,
        ...(line.size && line.size !== 'medium' ? { instance: { size: line.size as ItemSize } } : {}),
      });
    }
    const itemType = await this.itemFactory.itemType(line.itemTypeId);
    return this.itemFactory.build(itemType, {
      gameId: holder.gameId,
      holder: holder.holder,
      character: holder.character,
      amount: itemType.info.stackable ? (line.amount ?? 1) : null,
      name: line.name,
      value: line.value,
      acquiredPrice: 0,
      instance: {
        ...(line.carats !== undefined && line.carats !== null ? { carats: line.carats } : {}),
        ...(line.jewelryClass ? { jewelryClass: line.jewelryClass } : {}),
        ...(line.size && line.size !== 'medium' && itemType.category !== 'gem' ? { size: line.size as ItemSize } : {}),
      },
      magicSource: 'treasure',
      owner: userId,
    });
  }
}
