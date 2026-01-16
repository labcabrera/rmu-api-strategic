import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelUpCommand } from '../commands/level-up.command';
import type { CharacterRepository } from '../../ports/character.repository';

@CommandHandler(LevelUpCommand)
export class LevelUpHandler implements ICommandHandler<LevelUpCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: LevelUpCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    character.levelUp(command.force);
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character);
    //TODO propagate events
    return updated;
  }
}
