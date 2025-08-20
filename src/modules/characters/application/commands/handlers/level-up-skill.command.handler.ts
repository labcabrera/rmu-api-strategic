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
import { CharacterLevelCalculator } from 'src/modules/characters/domain/services/character-level-calculator';
import * as scc from '../../ports/out/skill-category-client';
import { CharacterSkill } from 'src/modules/characters/infrastructure/persistence/models/character.model-childs';
import { SkillResponse } from '../../ports/out/skill-client';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillCommandHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterLevelDevRepository') private readonly characterLevelRepository: cldr.CharacterLevelDevRepository,
    @Inject('SkillClient') private readonly skillClient: sc.SkillClient,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: scc.SkillCategoryClient,
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
        skills: new Map<string, number[]>(),
        owner: character.owner,
        createdAt: new Date(),
      };
    }

    const costs = profession.skillCosts[skill.categoryId]! as number[];
    const devSkills = (clr.skills?.get(command.skillId) as number[]) || [];

    const currentSkillLevel = devSkills.length || 0;
    const requiredLevel = currentSkillLevel + 1;
    if (requiredLevel >= costs.length) {
      throw new ValidationError('Skill level exceeds limit');
    }

    const cost = costs[requiredLevel - 1];
    devSkills.push(cost);
    clr.skills!.set(command.skillId, devSkills);

    const used = CharacterLevelCalculator.calculateUsedDevPoints(clr);
    if (used > character.experience.developmentPoints) {
      throw new ValidationError('Insufficient development points');
    }

    // Update character skill
    const characterSkill = character.skills.find((s) => s.skillId === command.skillId);
    if (!characterSkill) {
      const attributeBonus = await this.getAttributeBonus(skill);
      character.skills.push({
        skillId: command.skillId,
        specialization: command.specialization,
        statistics: attributeBonus,
        ranks: 1,
        statBonus: 0,
        racialBonus: 0,
        developmentBonus: 0,
        customBonus: 0,
        totalBonus: 0,
      });
    } else {
      characterSkill.ranks += 1;
    }
    character.experience.availableDevelopmentPoints = character.experience.developmentPoints - used;

    if (insert) {
      await this.characterLevelRepository.create(clr);
    } else {
      await this.characterLevelRepository.update(clr.id!, clr);
    }
    //TODO
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  private async getAttributeBonus(skill: SkillResponse): Promise<string[]> {
    const category = await this.skillCategoryClient.getSkillCategoryById(skill.categoryId);
    if (!category) {
      throw new Error('Skill category not found');
    }
    return category.bonus.concat(skill.bonus);
  }
}
