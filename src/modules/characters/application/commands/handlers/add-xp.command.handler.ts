import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { AddXPCommand } from '../add-xp.command';

@CommandHandler(AddXPCommand)
export class AddXPCommandHandler implements ICommandHandler<AddXPCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: AddXPCommand): Promise<Character> {
    //TODO check admin role
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    character.experience.xp += command.xp;
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }
}
