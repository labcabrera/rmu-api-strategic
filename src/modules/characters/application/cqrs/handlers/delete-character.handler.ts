import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteCharacterCommand } from '../commands/delete-character.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { CharacterDeletedEvent } from '../../../domain/events/character.events.js';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../../ports/healing-log-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeleteCharacterCommand)
export class DeleteCharacterHandler implements ICommandHandler<DeleteCharacterCommand> {
  private readonly logger = new Logger(DeleteCharacterHandler.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
  ) {}

  async execute(command: DeleteCharacterCommand): Promise<void> {
    this.logger.log(`Deleting character ${command.characterId} by user ${command.userId}`);
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    await this.characterRepository.deleteById(command.characterId);
    await this.healingLogRepository.deleteByCharacterId(command.characterId);
    await this.events.publish('character', new CharacterDeletedEvent(character.getProps()));
  }
}
