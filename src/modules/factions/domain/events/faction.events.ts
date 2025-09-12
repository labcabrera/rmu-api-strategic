import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { Faction } from '../aggregates/faction.aggregate';

export class FactionCreatedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('FactionCreatedEvent', data);
  }
}

export class FactionUpdatedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('FactionUpdatedEvent', data);
  }
}

export class FactionDeletedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('FactionDeletedEvent', data);
  }
}
