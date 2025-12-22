import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { CharacterProps } from '../aggregates/character.aggregate';

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
