import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCharacterCommand } from '../commands/delete-character.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(DeleteCharacterCommand)
export class DeleteCharacterHandler implements ICommandHandler<DeleteCharacterCommand> {
  constructor(@Inject('CharacterRepository') private readonly characterRepository: CharacterRepository) {}

  async execute(command: DeleteCharacterCommand): Promise<void> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    await this.characterRepository.deleteById(command.characterId);
  }
}
