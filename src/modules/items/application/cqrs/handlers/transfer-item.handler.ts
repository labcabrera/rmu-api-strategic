import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { GOLD_COIN, Item } from '../../../domain/aggregates/item.js';
import { ItemHolders } from '../../../domain/value-objects/item-holder.vo.js';
import { TransferItemCommand } from '../commands/transfer-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { type HolderContext, HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { type ItemOperationResult, ItemStock } from '../../services/item-stock.service.js';
import { Wallet } from '../../services/wallet.service.js';

/**
 * Gives an item to another holder of the same game (workspace spec 023, decisions 8 and 9): the game master hands
 * the armory of a faction to its soldiers, and a player gives to its faction or to a companion of it. Units of a
 * stack become a stack of the new holder (joining the one it has); coins become gold of a faction.
 */
@CommandHandler(TransferItemCommand)
export class TransferItemHandler implements ICommandHandler<TransferItemCommand, ItemOperationResult> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly itemFactory: ItemFactory,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: TransferItemCommand): Promise<ItemOperationResult> {
    const item = await this.stock.load(command.itemId);
    if (ItemHolders.equals(item.holder, command.to)) {
      throw new ValidationError('The item already belongs to that holder', 'err-item-same-holder');
    }
    const from = await this.holderAccess.load(item.holder);
    const to = await this.holderAccess.load(command.to);
    await this.holderAccess.checkTransfer(from, to, command.userId, command.roles);
    const units = this.stock.units(item, command.amount);

    const moved = item.itemTypeId === GOLD_COIN ? await this.moveGold(from, to, units) : await this.moveItem(item, to, units);

    const entry = await this.ledger.record({
      gameId: from.gameId,
      kind: item.itemTypeId === GOLD_COIN ? 'gold-transfer' : 'transfer',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: units,
      from: from.holder,
      to: to.holder,
      payments:
        item.itemTypeId === GOLD_COIN
          ? [
              { holder: from.holder, gold: -units },
              { holder: to.holder, gold: units },
            ]
          : [],
      userId: command.userId,
    });
    await this.inventorySync.refresh(from.holder, to.holder);
    return { item: moved, entry };
  }

  private async moveGold(from: HolderContext, to: HolderContext, gold: number): Promise<Item | null> {
    const payments = await this.wallet.charge([{ context: from, gold }]);
    try {
      await this.wallet.credit(to, gold);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    return to.holder.kind === 'character' ? this.itemRepository.findStack(to.holder, GOLD_COIN) : null;
  }

  private async moveItem(item: Item, to: HolderContext, units: number): Promise<Item> {
    if (!item.info.stackable) {
      item.moveTo(to.holder);
      const updated = await this.itemRepository.update(item);
      await this.events.publishChanges('item', item);
      return updated;
    }
    // A stack: its units go to a stack of the new holder, and the old one shrinks or goes away
    const copy = Item.create({ ...item.getProps(), ...ItemHolders.ids(to.holder), amount: units, carried: false });
    const stored = await this.itemFactory.store(copy);
    try {
      await this.stock.take(item, units);
    } catch (e) {
      await this.itemFactory.unstore(stored, units);
      throw e;
    }
    return stored.item;
  }
}
