import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { Character } from '../../domain/aggregates/character.aggregate';

export interface CharacterEventBusPort {
  publish(event: DomainEvent<Character>): void;
}
