import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteCharactersByGameCommand } from '../commands/delete-characters-by-game.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../../ports/healing-log-repository.port.js';
import { CharacterDeletedEvent } from '../../../domain/events/character.events.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Deletes the characters of a deleted game through the repository, one at a time, like DeleteCharacterHandler: the
 * healing log goes with each one and a character.deleted is published per character. Idempotent: a repeated message
 * no longer finds any character.
 */
@CommandHandler(DeleteCharactersByGameCommand)
export class DeleteCharactersByGameHandler implements ICommandHandler<DeleteCharactersByGameCommand, void> {
  private readonly logger = new Logger(DeleteCharactersByGameHandler.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteCharactersByGameCommand): Promise<void> {
    const characters = await this.characterRepository.findByGameId(command.gameId);
    this.logger.log(`Deleting ${characters.length} characters of game ${command.gameId}`);
    for (const character of characters) {
      await this.characterRepository.deleteById(character.id);
      await this.healingLogRepository.deleteByCharacterId(character.id);
      await this.events.publish('character', new CharacterDeletedEvent(character.getProps()));
    }
  }
}
