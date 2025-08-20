import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/out/character.repository';
import { LevelUpSkillCommand } from '../level-up-skill.command';
import * as cldr from '../../ports/out/character-level-dev.repository';
import { CharacterLevelDev } from 'src/modules/characters/domain/entities/character-level-dev.entity';
import * as pc from '../../ports/out/profession-client';
import * as sc from '../../ports/out/skill-client';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillCommandHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterLevelDevRepository') private readonly characterLevelRepository: cldr.CharacterLevelDevRepository,
    @Inject('SkillClient') private readonly skillClient: sc.SkillClient,
    @Inject('ProfessionClient') private readonly professionClient: pc.ProfessionClient,
  ) {}

  async execute(command: LevelUpSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const profession = await this.professionClient.getProfessionById(character.info.professionId);
    if (!profession) {
      throw new NotFoundError('Profession', character.info.professionId);
    }
    const skill = await this.skillClient.getSkillById(command.skillId);
    if (!skill) {
      throw new ValidationError('Invalid skill');
    }

    const level = character.experience.level;
    let clr: Partial<CharacterLevelDev> | null = await this.characterLevelRepository.findByCharacterAndLevel(characterId, level);
    let insert = false;
    if (!clr) {
      insert = true;
      clr = {
        characterId: characterId,
        level: level,
        skills: {},
      };
    }

    const currentSkillLevel = clr.skills![command.skillId] || 0;
    const requiredLevel = currentSkillLevel + 1;
    if (requiredLevel > 3) {
      throw new ValidationError('Skill level exceeds limit');
    }

    //TODO

    if (insert) {
      await this.characterLevelRepository.create(clr);
    } else {
      await this.characterLevelRepository.update(clr.id!, clr);
    }
    //TODO
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }
}
