import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { Item } from '../../domain/aggregates/item.js';
import type { ItemLedgerEntry } from '../../domain/aggregates/item-ledger-entry.js';
import { ItemDeletedEvent } from '../../domain/events/item.events.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../ports/item-repository.port.js';

/** What an operation returns: the item as it is now (null when it is gone) and its ledger entry. */
export interface ItemOperationResult {
  item: Item | null;
  entry: ItemLedgerEntry;
}

/** Units taken off an item, so that they can be put back if a later step fails. */
export interface TakenUnits {
  item: Item;
  units: number;
  whole: boolean;
}

/** Loads the items of the operations and takes units off them (workspace spec 023, decision 8). */
@Injectable()
export class ItemStock {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async load(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundError('Item', itemId, 'err-item-not-found');
    return item;
  }

  /** The units of the operation: the given amount of a stack (at most all of it), or the whole item. */
  units(item: Item, amount: number | undefined): number {
    if (amount === undefined || amount === null) return item.units;
    if (!(amount > 0) || amount > item.units || (!item.info.stackable && amount !== 1)) {
      throw new ValidationError(`Invalid amount ${amount} of ${item.units}`, 'err-item-invalid-amount');
    }
    return amount;
  }

  /** Removes the units from the holder: the whole item is deleted, or the stack shrinks. */
  async take(item: Item, units: number): Promise<TakenUnits> {
    const whole = units >= item.units;
    if (whole) {
      await this.itemRepository.deleteById(item.id);
      await this.events.publish('item', new ItemDeletedEvent(item.getProps()));
    } else {
      item.takeAmount(units);
      await this.itemRepository.update(item);
      await this.events.publishChanges('item', item);
    }
    return { item, units, whole };
  }

  /** Undoes take(). */
  async restore(taken: TakenUnits): Promise<void> {
    if (taken.whole) {
      await this.itemRepository.save(Item.fromProps(taken.item.getProps()));
      return;
    }
    const current = await this.itemRepository.findById(taken.item.id);
    if (!current) return;
    current.addAmount(taken.units);
    await this.itemRepository.update(current);
  }
}
