import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { ItemProps } from '../aggregates/item-props';

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
