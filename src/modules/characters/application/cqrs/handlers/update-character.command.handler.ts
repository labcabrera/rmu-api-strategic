import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { UpdateCharacterCommand } from '../commands/update-character.command';

@CommandHandler(UpdateCharacterCommand)
export class UpdateCharacterCommandHandler implements ICommandHandler<UpdateCharacterCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    this.bindFields(character, command);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  private bindFields(character: Character, command: UpdateCharacterCommand): void {
    if (command.name) {
      character.name = command.name;
    }
    if (command.description) {
      character.description = command.description;
    }
  }
}
