import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelDownSkillCommand } from '../commands/level-down-skill.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(LevelDownSkillCommand)
export class LevelDownSkillHandler implements ICommandHandler<LevelDownSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: LevelDownSkillCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    character.levelDownSkill(command.skillId, command.specialization);
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character);
    //TODO propagate events
    return updated;
  }
}
