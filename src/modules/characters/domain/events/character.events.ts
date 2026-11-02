import { DomainEvent } from '../../../shared/domain/events/domain-event.js';
import type { CharacterProps } from '../aggregates/character-props.js';

export class CharacterCreatedEvent extends DomainEvent<CharacterProps> {
  constructor(data: CharacterProps) {
    super('created', data);
  }
}

export class CharacterUpdatedEvent extends DomainEvent<CharacterProps> {
  constructor(data: CharacterProps) {
    super('updated', data);
  }
}

export class CharacterDeletedEvent extends DomainEvent<CharacterProps> {
  constructor(data: CharacterProps) {
    super('deleted', data);
  }
}
