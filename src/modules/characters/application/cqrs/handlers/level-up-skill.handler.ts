import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character, WeaponDevelopmentType } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/character.repository';
import { LevelUpSkillCommand } from '../commands/level-up-skill.command';
import * as cldr from '../../ports/character-level-dev.repository';
import { CharacterLevelDev } from 'src/modules/characters/domain/aggregates/character-level-dev.aggregate';
import * as pc from '../../ports/profession-client.port';
import * as sc from '../../ports/skill-client.port';
import { CharacterLevelCalculator } from 'src/modules/characters/domain/services/character-level-calculator';
import * as scc from '../../ports/skill-category-client.port';
import { SkillResponse } from '../../ports/skill-client.port';
import { CharacterSkill } from 'src/modules/characters/infrastructure/persistence/models/character-childs.model';

@CommandHandler(LevelUpSkillCommand)
export class LevelUpSkillHandler implements ICommandHandler<LevelUpSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterLevelDevRepository') private readonly characterLevelRepository: cldr.CharacterLevelDevRepository,
    @Inject('SkillClient') private readonly skillClient: sc.SkillClientPort,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: scc.SkillCategoryClientPort,
    @Inject('ProfessionClient') private readonly professionClient: pc.ProfessionClientPort,
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
    let cld: Partial<CharacterLevelDev> | null = await this.characterLevelRepository.findByCharacterAndLevel(
      characterId,
      level,
    );
    let insert = false;
    if (!cld) {
      insert = true;
      cld = {
        characterId: characterId,
        level: level,
        skills: new Map<string, number[]>(),
        owner: character.owner,
        createdAt: new Date(),
      };
    }
    const devSkills = (cld.skills?.get(command.skillId) as number[]) || [];
    const cost = this.getDevCost(character, skill, profession, cld, command);
    devSkills.push(cost);
    cld.skills!.set(command.skillId, devSkills);

    const used = CharacterLevelCalculator.calculateUsedDevPoints(cld);
    if (used > character.experience.developmentPoints) {
      throw new ValidationError('Insufficient development points');
    }
    // Update character skill
    const characterSkill = character.skills.find((s) => s.skillId === command.skillId);
    if (!characterSkill) {
      const attributeBonus = await this.getAttributeBonus(skill);
      character.skills.push(this.buildCharacterSkillTemplate(command, attributeBonus));
    } else {
      characterSkill.ranks += 1;
    }
    character.experience.availableDevelopmentPoints = character.experience.developmentPoints - used;

    if (insert) {
      await this.characterLevelRepository.create(cld);
    } else {
      await this.characterLevelRepository.update(cld.id!, cld);
    }
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  /**
   * Obtain the skill development cost. In the case of combat skills, instead of using the categoryId,
   * check the order in which they are assigned to the character to see which one to use.
   */
  private getDevCost(
    character: Character,
    skill: SkillResponse,
    profession: pc.ProfessionResponse,
    cld: Partial<CharacterLevelDev>,
    command: LevelUpSkillCommand,
  ): number {
    let category = skill.categoryId;

    if (skill.categoryId === 'combat-training') {
      const type = this.resolveWeapontCategory(skill.id);
      const index = character.experience.weaponDevelopment.indexOf(type);
      category = `combat${index + 1}`;
    }
    const costs = profession.skillCosts[category]! as number[];
    const devSkills = (cld.skills?.get(command.skillId) as number[]) || [];

    const currentSkillLevel = devSkills.length || 0;
    const requiredLevel = currentSkillLevel + 1;

    //TODO GM should permit one additional extra level
    if (requiredLevel > costs.length) {
      throw new ValidationError('Skill level exceeds limit');
    }
    return costs[requiredLevel - 1];
  }

  private buildCharacterSkillTemplate(command: LevelUpSkillCommand, attributeBonus: string[]): CharacterSkill {
    return {
      skillId: command.skillId,
      specialization: command.specialization,
      statistics: attributeBonus,
      professional: undefined,
      ranks: 1,
      statBonus: 0,
      racialBonus: 0,
      developmentBonus: 0,
      professionalBonus: 0,
      customBonus: 0,
      totalBonus: 0,
    };
  }

  private resolveWeapontCategory(skillId: string): WeaponDevelopmentType {
    if (skillId.search('melee') !== -1) {
      return 'melee';
    } else if (skillId.search('ranged') !== -1) {
      return 'ranged';
    } else if (skillId.search('shield') !== -1) {
      return 'shield';
    }
    return 'unarmed';
  }

  private async getAttributeBonus(skill: SkillResponse): Promise<string[]> {
    const category = await this.skillCategoryClient.getSkillCategoryById(skill.categoryId);
    if (!category) {
      throw new Error('Skill category not found');
    }
    return category.bonus.concat(skill.bonus);
  }
}
