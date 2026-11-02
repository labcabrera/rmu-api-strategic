import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Item } from '../../../domain/aggregates/item.js';
import type { LedgerPayment } from '../../../domain/aggregates/item-ledger-entry.js';
import type { MagicItemQuote } from '../../../domain/services/magic-item-pricing.js';
import { roundGold } from '../../../domain/services/price-calculator.js';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { ItemStock } from '../../services/item-stock.service.js';
import { MagicItems } from '../../services/magic-items.service.js';
import { Wallet } from '../../services/wallet.service.js';
import { ChangeItemChargesCommand, CreateMagicItemCommand, QuoteMagicItemQuery } from '../commands/magic-item.commands.js';

/** Silver per day of recharging a charged item (Treasure Law 3.3, Charged Items). */
export const RECHARGE_SP_PER_DAY = 2;

@QueryHandler(QuoteMagicItemQuery)
export class QuoteMagicItemHandler implements IQueryHandler<QuoteMagicItemQuery, MagicItemQuote> {
  constructor(private readonly magicItems: MagicItems) {}

  execute(query: QuoteMagicItemQuery): Promise<MagicItemQuote> {
    return this.magicItems.quote(query.request, query.powerLevel);
  }
}

/**
 * A magic item of the game master (workspace spec 067, decision 7): whoever can manage the holder gives it, for free
 * or paid by a holder of the same game they can also manage. Ledger `magic-item`.
 */
@CommandHandler(CreateMagicItemCommand)
export class CreateMagicItemHandler implements ICommandHandler<CreateMagicItemCommand, Item> {
  constructor(
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    private readonly holderAccess: HolderAccess,
    private readonly magicItems: MagicItems,
    private readonly itemFactory: ItemFactory,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CreateMagicItemCommand): Promise<Item> {
    const { userId, roles } = command;
    this.itemGuard.checkCreate(roles);
    const holder = await this.holderAccess.load(command.holder);
    if (command.gameId && command.gameId !== holder.gameId) {
      throw new ValidationError('The holder is not in this game', 'err-item-other-game');
    }
    await this.holderAccess.checkManage(holder, userId, roles);
    const payer = command.payer ? await this.holderAccess.load(command.payer) : null;
    if (payer) {
      this.holderAccess.checkSameGame(holder, payer);
      await this.holderAccess.checkManage(payer, userId, roles);
    }

    const prepared = await this.magicItems.prepare(command.request, command.powerLevel);
    const price = prepared.quote.price;
    const payments = payer ? await this.wallet.charge([{ context: payer, gold: price }]) : [];
    let item: Item;
    try {
      const built = this.magicItems.build(prepared, holder, { source: 'manual', acquiredPrice: payer ? price : 0, owner: userId });
      item = (await this.itemFactory.store(built)).item;
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'magic-item',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: item.units,
      from: null,
      to: holder.holder,
      payments,
      details: { days: prepared.quote.days, itemLevel: prepared.quote.itemLevel, price, breakdown: prepared.quote.breakdown },
      userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return item;
  }
}

/**
 * Charges of an item (workspace spec 067, decision 8): spending or adding them is free; a recharge fills it and costs
 * its holder 2 sp per day, one day per level of its highest spell (Charged Items, 3.3). Ledger `recharge`.
 */
@CommandHandler(ChangeItemChargesCommand)
export class ChangeItemChargesHandler implements ICommandHandler<ChangeItemChargesCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
  ) {}

  async execute(command: ChangeItemChargesCommand): Promise<Item> {
    const item = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(item.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    if (!('recharge' in command.change)) {
      item.changeCharges(command.change.delta);
      const updated = await this.itemRepository.update(item);
      await this.events.publishChanges('item', item);
      return updated;
    }

    item.recharge();
    const days = ChangeItemChargesHandler.rechargeDays(item);
    const gold = roundGold((RECHARGE_SP_PER_DAY * days) / 10);
    const payments: LedgerPayment[] = await this.wallet.charge([{ context: holder, gold }]);
    let updated: Item;
    try {
      updated = await this.itemRepository.update(item);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    await this.events.publishChanges('item', item);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'recharge',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: 1,
      from: null,
      to: holder.holder,
      payments,
      details: { days, charges: item.charges },
      userId: command.userId,
    });
    return updated;
  }

  /** Days of a recharge: the level of the highest spell of the item, or its item level. */
  static rechargeDays(item: Item): number {
    const spells = item.enchantment?.spells ?? [];
    const level = spells.length ? Math.max(...spells.map(spell => spell.level)) : (item.enchantment?.itemLevel ?? 0);
    return Math.max(1, level);
  }
}
