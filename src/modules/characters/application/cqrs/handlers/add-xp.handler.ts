import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/character.repository';
import { AddXPCommand } from '../commands/add-xp.command';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(AddXPCommand)
export class AddXPHandler implements ICommandHandler<AddXPCommand, Character> {
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
    return await this.characterRepository.update(character);
  }
}
