import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { ItemProps } from '../../domain/aggregates/item-props';

export interface ItemEventBusPort {
  publish(event: DomainEvent<ItemProps>): void;
}
