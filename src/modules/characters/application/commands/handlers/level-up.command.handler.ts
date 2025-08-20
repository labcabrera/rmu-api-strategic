import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { LevelUpCommand } from '../level-up.command';

@CommandHandler(LevelUpCommand)
export class LevelUpCommandHandler implements ICommandHandler<LevelUpCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: LevelUpCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    if (character.experience.level >= character.experience.availableLevel) {
      throw new ValidationError('Insufficient experience points to level up.');
    }
    if (character.experience.availableDevelopmentPoints > 5 && !command.force) {
      throw new ValidationError('Has unused development points. To level up regardless of points, use the option force=true.');
    }
    //TODO calculate from other factors
    const devPoints = 60;
    character.experience.level += 1;
    character.experience.developmentPoints = devPoints;
    character.experience.availableDevelopmentPoints = devPoints;
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }
}
