import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Item } from '../../../domain/aggregates/item.js';
import type { ItemLedgerEntry, LedgerPayment } from '../../../domain/aggregates/item-ledger-entry.js';
import { PurchaseOrderCommand } from '../commands/purchase-order.command.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { PurchasePricing } from '../../services/purchase-pricing.service.js';
import { Wallet } from '../../services/wallet.service.js';

export interface PurchaseOrderResult {
  items: Item[];
  entries: ItemLedgerEntry[];
}

/**
 * A purchase order (workspace spec 048): every line is priced with the same market conditions and Trading maneuver,
 * then each line is paid and its items stored. If a line fails (not enough gold, a store error), the lines already
 * done are undone: their items removed and their gold given back. The ledger gets one entry per line at the end.
 */
@CommandHandler(PurchaseOrderCommand)
export class PurchaseOrderHandler implements ICommandHandler<PurchaseOrderCommand, PurchaseOrderResult> {
  constructor(
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    private readonly holderAccess: HolderAccess,
    private readonly itemFactory: ItemFactory,
    private readonly pricing: PurchasePricing,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: PurchaseOrderCommand): Promise<PurchaseOrderResult> {
    const { options, userId, roles } = command;
    this.itemGuard.checkCreate(roles);
    const buyer = await this.holderAccess.load(command.buyer);
    if (options.gameId && options.gameId !== buyer.gameId) {
      throw new ValidationError('The buyer is not in this game', 'err-item-other-game');
    }
    await this.holderAccess.checkManage(buyer, userId, roles);
    const faction = this.holderAccess.factionOf(buyer);
    const order = await this.pricing.order(command.lines, { ...options, character: buyer.character, check: true });

    // Only the game master spends the gold of the faction
    const payer = options.payer ?? 'split';
    const planned = await this.wallet.plan(buyer, payer, order.total, faction);
    if (buyer.character && planned.some(charge => charge.context.holder.kind === 'faction')) {
      await this.holderAccess.checkManage(faction, userId, roles);
    }

    const done: { stored: { item: Item; merged: boolean }[]; units: number; payments: LedgerPayment[] }[] = [];
    try {
      for (const line of order.lines) {
        const payments = await this.wallet.charge(await this.wallet.plan(buyer, payer, line.price.total, faction));
        const current = { stored: [] as { item: Item; merged: boolean }[], units: line.stackable ? line.amount : 1, payments };
        done.push(current);
        for (let index = 0; index < (line.stackable ? 1 : line.amount); index++) {
          const item = this.itemFactory.build(line.itemType, {
            gameId: buyer.gameId,
            holder: buyer.holder,
            character: buyer.character,
            amount: current.units,
            acquiredPrice: line.price.unitPrice,
            owner: userId,
          });
          current.stored.push(await this.itemFactory.store(item));
        }
      }
    } catch (e) {
      for (const line of done.reverse()) {
        for (const stored of line.stored.reverse()) await this.itemFactory.unstore(stored, line.units);
        await this.wallet.revert(line.payments);
      }
      throw e;
    }

    const orderId = randomUUID();
    const entries: ItemLedgerEntry[] = [];
    for (const [index, line] of order.lines.entries()) {
      const items = done[index].stored.map(stored => stored.item);
      entries.push(
        await this.ledger.record({
          gameId: buyer.gameId,
          kind: 'purchase',
          itemId: items[0].id,
          itemIds: items.map(item => item.id),
          itemTypeId: line.itemType.id,
          itemName: items[0].name,
          amount: line.amount,
          from: null,
          to: buyer.holder,
          payments: done[index].payments,
          price: line.price,
          maneuver: order.maneuver ?? null,
          details: { orderId, line: index + 1, lines: order.lines.length },
          userId,
        }),
      );
    }
    await this.inventorySync.refresh(buyer.holder);
    return { items: done.flatMap(line => line.stored.map(stored => stored.item)), entries };
  }
}
