import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCharacterCommand } from '../commands/delete-character.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { CharacterDeletedEvent } from 'src/modules/characters/domain/events/character.events';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';

@CommandHandler(DeleteCharacterCommand)
export class DeleteCharacterHandler implements ICommandHandler<DeleteCharacterCommand> {
  private readonly logger = new Logger(DeleteCharacterHandler.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: DeleteCharacterCommand): Promise<void> {
    this.logger.log(`Deleting character ${command.characterId} by user ${command.userId}`);
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    await this.characterRepository.deleteById(command.characterId);
    this.characterEventBus.publish(new CharacterDeletedEvent(character.getProps()));
  }
}
