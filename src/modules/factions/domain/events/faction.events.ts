import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { Faction } from '../aggregates/faction.aggregate';

export class FactionCreatedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('created', data);
  }
}

export class FactionUpdatedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('updated', data);
  }
}

export class FactionDeletedEvent extends DomainEvent<Faction> {
  constructor(data: Faction) {
    super('deleted', data);
  }
}
