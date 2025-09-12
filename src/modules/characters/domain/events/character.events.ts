import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { Character } from '../aggregates/character.aggregate';

export class CharacterCreatedEvent extends DomainEvent<Character> {
  constructor(data: Character) {
    super('created', data);
  }
}

export class CharacterUpdatedEvent extends DomainEvent<Character> {
  constructor(data: Character) {
    super('updated', data);
  }
}

export class CharacterDeletedEvent extends DomainEvent<Character> {
  constructor(data: Character) {
    super('deleted', data);
  }
}
