import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { Character, CharacterProps } from '../aggregates/character.aggregate';

export class CharacterCreatedEvent extends DomainEvent<CharacterProps> {
  constructor(data: Character) {
    super('created', data.getProps());
  }
}

export class CharacterUpdatedEvent extends DomainEvent<CharacterProps> {
  constructor(data: Character) {
    super('updated', data.getProps());
  }
}

export class CharacterDeletedEvent extends DomainEvent<CharacterProps> {
  constructor(data: Character) {
    super('deleted', data.getProps());
  }
}
