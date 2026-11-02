import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { Character } from '../../domain/aggregates/character.js';
import { CharacterUpdatedEvent } from '../../domain/events/character.events.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../ports/character-repository.port.js';

/**
 * Stores a changed character and publishes one character.updated with its final state (F-strategic-14): most
 * mutations (xp, level up, skills, equipment, temporary stats...) change the character without an event of their own.
 * Without changes nothing is written or published (spec 021, decision 9).
 */
@Injectable()
export class CharacterWriter {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async save(character: Character): Promise<Character> {
    if (!character.hasChanges()) return character;
    const updated = await this.characterRepository.update(character);
    // The events some mutations applied carry an intermediate state: the final one goes out instead.
    character.uncommit();
    await this.events.publish('character', new CharacterUpdatedEvent(updated.getProps()));
    return updated;
  }
}
