import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DiscardItemCommand } from '../commands/discard-item.command.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { type ItemOperationResult, ItemStock } from '../../services/item-stock.service.js';

/** Throws away an item or units of a stack (workspace spec 023, decision 8): no gold, but an entry in the ledger. */
@CommandHandler(DiscardItemCommand)
export class DiscardItemHandler implements ICommandHandler<DiscardItemCommand, ItemOperationResult> {
  constructor(
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: DiscardItemCommand): Promise<ItemOperationResult> {
    const item = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(item.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    const units = this.stock.units(item, command.amount);
    const props = item.getProps();
    const taken = await this.stock.take(item, units);
    const entry = await this.ledger.record({
      gameId: holder.gameId,
      kind: 'discard',
      itemId: props.id,
      itemTypeId: props.itemTypeId,
      itemName: props.name,
      amount: units,
      from: holder.holder,
      to: null,
      note: command.note ?? null,
      userId: command.userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return { item: taken.whole ? null : taken.item, entry };
  }
}
