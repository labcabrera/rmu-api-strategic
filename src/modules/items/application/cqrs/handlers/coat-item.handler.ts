import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Item } from '../../../domain/aggregates/item.js';
import { COATING_HOURS } from '../../../domain/value-objects/item-coating.vo.js';
import { CoatItemCommand, RemoveCoatingCommand } from '../commands/coat-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { type ItemOperationResult, ItemStock } from '../../services/item-stock.service.js';

/**
 * A dose of a liquid or paste poison of the same holder on a weapon (workspace spec 042, decision 11). The dose leaves
 * the inventory with a ledger entry; a coating the weapon already had is replaced.
 */
@CommandHandler(CoatItemCommand)
export class CoatItemHandler implements ICommandHandler<CoatItemCommand, ItemOperationResult> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CoatItemCommand): Promise<ItemOperationResult> {
    const weapon = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(weapon.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    if (!weapon.weapon) throw new ValidationError('Only a weapon can be coated with poison', 'err-item-not-weapon');
    const poisonItem = await this.stock.load(command.poisonItemId);
    if (!poisonItem.isHeldBy(weapon.holder)) {
      throw new ValidationError('The poison must be held by the holder of the weapon', 'err-item-not-same-holder');
    }
    const poison = poisonItem.catalog?.features?.poison;
    const hours = poison?.form ? COATING_HOURS[poison.form] : undefined;
    if (!poison || hours === undefined) {
      throw new ValidationError('Only a liquid or paste poison coats a weapon', 'err-poison-not-coating');
    }
    const taken = await this.stock.take(poisonItem, 1);
    let updated: Item;
    try {
      weapon.coat({
        itemTypeId: poisonItem.itemTypeId,
        name: poisonItem.name,
        poison: { ...structuredClone(poison), itemTypeId: poisonItem.itemTypeId, name: poisonItem.name },
        appliedAt: new Date().toISOString(),
        hoursLeft: hours,
      });
      updated = await this.itemRepository.update(weapon);
      await this.events.publishChanges('item', weapon);
    } catch (e) {
      await this.stock.restore(taken);
      throw e;
    }
    const entry = await this.ledger.record({
      gameId: holder.gameId,
      kind: 'discard',
      itemId: poisonItem.id,
      itemTypeId: poisonItem.itemTypeId,
      itemName: poisonItem.name,
      amount: 1,
      from: holder.holder,
      to: null,
      note: `coating:${weapon.id}`,
      userId: command.userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return { item: updated, entry };
  }
}

@CommandHandler(RemoveCoatingCommand)
export class RemoveCoatingHandler implements ICommandHandler<RemoveCoatingCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
  ) {}

  async execute(command: RemoveCoatingCommand): Promise<Item> {
    const item = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(item.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    item.removeCoating();
    const updated = await this.itemRepository.update(item);
    await this.events.publishChanges('item', item);
    return updated;
  }
}
