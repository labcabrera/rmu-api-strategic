import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Item } from '../../../domain/aggregates/item.js';
import { PriceCalculator } from '../../../domain/services/price-calculator.js';
import { PurchaseItemCommand } from '../commands/purchase-item.command.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import type { ItemOperationResult } from '../../services/item-stock.service.js';
import { TradingService } from '../../services/trading.service.js';
import { Wallet } from '../../services/wallet.service.js';

/** Items of a type that does not stack created by one purchase (spec 041, decision 12). */
export const MAX_ITEMS_PER_PURCHASE = 100;

/**
 * A purchase (workspace spec 023, decisions 8, 9 and 12): the price is the asked one or the average cost of the type,
 * times the Trading percent; the gold is taken first and given back if the item cannot be stored. A character pays
 * with its coins and its faction pays the rest, but only the game master can spend the gold of the faction.
 * N units of a type that does not stack are N items, paid at once and undone together (workspace spec 041, decision 12).
 */
@CommandHandler(PurchaseItemCommand)
export class PurchaseItemHandler implements ICommandHandler<PurchaseItemCommand, ItemOperationResult> {
  constructor(
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    private readonly holderAccess: HolderAccess,
    private readonly itemFactory: ItemFactory,
    private readonly wallet: Wallet,
    private readonly trading: TradingService,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: PurchaseItemCommand): Promise<ItemOperationResult> {
    const { options, userId, roles } = command;
    // New items: rmu-user or rmu-admin
    this.itemGuard.checkCreate(roles);
    const buyer = await this.holderAccess.load(command.buyer);
    if (options.gameId && options.gameId !== buyer.gameId) {
      throw new ValidationError('The buyer is not in this game', 'err-item-other-game');
    }
    await this.holderAccess.checkManage(buyer, userId, roles);
    const faction = this.holderAccess.factionOf(buyer);

    const itemType = await this.itemFactory.itemType(command.itemTypeId);
    const amount = options.amount ?? 1;
    const stackable = !!itemType.info.stackable;
    if (!stackable && (!Number.isInteger(amount) || amount > MAX_ITEMS_PER_PURCHASE)) {
      throw new ValidationError(`Up to ${MAX_ITEMS_PER_PURCHASE} whole units of a type that does not stack`, 'err-item-invalid-amount');
    }
    const base = options.unitPrice ?? itemType.info.cost?.average ?? 0;
    if (base < 0) throw new ValidationError('The price cannot be negative', 'err-item-invalid-price');
    const trading = options.trading ? await this.trading.resolve('purchase', options.trading, buyer.character) : undefined;
    const price = PriceCalculator.purchase(base, amount, trading?.result);

    const charges = await this.wallet.plan(buyer, options.payer ?? 'split', price.total, faction);
    if (buyer.character && charges.some(charge => charge.context.holder.kind === 'faction')) {
      await this.holderAccess.checkManage(faction, userId, roles);
    }
    const payments = await this.wallet.charge(charges);

    const stored: { item: Item; merged: boolean }[] = [];
    try {
      for (let index = 0; index < (stackable ? 1 : amount); index++) {
        const item = this.itemFactory.build(itemType, {
          gameId: buyer.gameId,
          holder: buyer.holder,
          character: buyer.character,
          amount: stackable ? amount : 1,
          name: options.name,
          description: options.description,
          wielderSize: options.wielderSize,
          carried: options.carried,
          acquiredPrice: price.unitPrice,
          owner: userId,
        });
        stored.push(await this.itemFactory.store(item));
      }
    } catch (e) {
      for (const done of stored.reverse()) await this.itemFactory.unstore(done, stackable ? amount : 1);
      await this.wallet.revert(payments);
      throw e;
    }
    const items = stored.map(done => done.item);

    const entry = await this.ledger.record({
      gameId: buyer.gameId,
      kind: 'purchase',
      itemId: items[0].id,
      itemIds: items.map(item => item.id),
      itemTypeId: itemType.id,
      itemName: items[0].name,
      amount,
      from: null,
      to: buyer.holder,
      payments,
      price,
      maneuver: trading?.maneuver ?? null,
      userId,
    });
    await this.inventorySync.refresh(buyer.holder);
    return { item: items[0], ...(stackable ? {} : { items }), entry };
  }
}
