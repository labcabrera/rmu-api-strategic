import { DomainEvent } from '../../../shared/domain/events/domain-event.js';
import type { ItemProps } from '../aggregates/item-props.js';

export class ItemCreatedEvent extends DomainEvent<ItemProps> {
  constructor(data: ItemProps) {
    super('created', data);
  }
}

export class ItemUpdatedEvent extends DomainEvent<ItemProps> {
  constructor(data: ItemProps) {
    super('updated', data);
  }
}

export class ItemDeletedEvent extends DomainEvent<ItemProps> {
  constructor(data: ItemProps) {
    super('deleted', data);
  }
}
