import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { FactionProps } from '../../domain/aggregates/faction-props';

export interface FactionEventBusPort {
  publish(event: DomainEvent<FactionProps>): void;
}
