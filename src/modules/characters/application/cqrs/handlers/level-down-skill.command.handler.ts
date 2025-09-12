import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/out/character.repository';
import * as cldr from '../../ports/out/character-level-dev.repository';
import { CharacterLevelDev } from 'src/modules/characters/domain/entities/character-level-dev.entity';
import * as pc from '../../ports/out/profession-client';
import * as sc from '../../ports/out/skill-client';
import { LevelDownSkillCommand } from '../commands/level-down-skill.command';
import { CharacterLevelCalculator } from 'src/modules/characters/domain/services/character-level-calculator';

@CommandHandler(LevelDownSkillCommand)
export class LevelDownSkillCommandHandler implements ICommandHandler<LevelDownSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterLevelDevRepository') private readonly characterLevelRepository: cldr.CharacterLevelDevRepository,
    @Inject('SkillClient') private readonly skillClient: sc.SkillClient,
    @Inject('ProfessionClient') private readonly professionClient: pc.ProfessionClient,
  ) {}

  async execute(command: LevelDownSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const characterSkill = character.skills.find((s) => s.skillId === command.skillId);
    if (!characterSkill) {
      throw new NotFoundError('Skill', command.skillId);
    }
    characterSkill.ranks--;

    const level = character.experience.level;
    const clr: Partial<CharacterLevelDev> | null = await this.characterLevelRepository.findByCharacterAndLevel(characterId, level);
    if (!clr) {
      throw new ValidationError('Character level development record not found');
    } else if (!clr.skills) {
      throw new ValidationError('Character level development skills not found');
    } else if (!clr.skills.has(command.skillId)) {
      throw new ValidationError('Skill not found in character level development record');
    }
    clr.skills.get(command.skillId)?.pop();
    if (clr.skills.get(command.skillId)?.length === 0) {
      clr.skills.delete(command.skillId);
    }

    const used = CharacterLevelCalculator.calculateUsedDevPoints(clr);
    character.experience.availableDevelopmentPoints = character.experience.developmentPoints - used;

    await this.characterLevelRepository.update(clr.id!, clr);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }
}
