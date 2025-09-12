import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

export interface FactionEventBusPort {
  publish(event: DomainEvent<Faction>): void;
}
