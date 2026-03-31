import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { CharacterProps } from '../../domain/aggregates/character-props';

export interface CharacterEventBusPort {
  publish(event: DomainEvent<CharacterProps>): void;
}
