import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CharacterSkill, type SkillDevPointsSpent } from '../../../domain/value-objects/character-skill.vo.js';
import { isFightingStyleSkill } from '../../../domain/value-objects/fighting-styles.vo.js';
import { freeStyleRanks, unallocatedStyleBonus } from '../../../domain/services/fighting-styles/style-allocation.js';
import type { ProfessionalBonusType } from '../../../domain/value-objects/professional-bonus-type.vo.js';

export class StyleAbilitySelectionDto {
  @ApiProperty({ description: 'Ability of the fighting style', example: 'lightning-reflexes' })
  abilityId: string;

  @ApiProperty({ description: 'Times selected', example: 1 })
  times: number;

  @ApiProperty({ description: 'Ranks each selection cost', example: 4 })
  cost: number;
}

export class CharacterSkillDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  skillId: string;

  @ApiProperty({ type: String, description: 'Specialization', example: 'cats' })
  specialization: string | null;

  @ApiProperty({ description: 'Associated statistics', example: ['WIS', 'CHA'] })
  statistics: string[];

  @ApiProperty({ description: 'Development values', example: [1, 2] })
  development: number[];

  @ApiProperty({ description: 'Professional bonuses' })
  professional: ProfessionalBonusType[] | null;

  @ApiProperty({ description: 'Total ranks, culture ranks included', example: 3 })
  ranks: number;

  @ApiProperty({ description: 'Ranks developed this level', example: 1 })
  ranksDeveloped: number;

  @ApiProperty({ description: 'Ranks granted by the culture at creation', example: 1 })
  cultureRanks: number;

  @ApiProperty({ description: 'Development points spent on this skill in the current level, by pool', example: { normal: 4, bonus: 0 } })
  devPointsSpent: SkillDevPointsSpent;

  @ApiProperty({ description: 'Stat bonus', example: 2 })
  statBonus: number;

  @ApiProperty({ description: 'Racial bonus', example: 1 })
  racialBonus: number;

  @ApiProperty({ description: 'Development bonus', example: 2 })
  developmentBonus: number;

  @ApiProperty({ description: 'Professional bonus', example: 3 })
  professionalBonus: number;

  @ApiProperty({ description: 'Custom bonus (armor penalties and manual adjustments)', example: 5 })
  customBonus: number;

  @ApiProperty({ description: 'Bonus from talents and flaws', example: 10 })
  traitBonus: number;

  @ApiProperty({ description: 'Total bonus', example: 10 })
  totalBonus: number;

  @ApiProperty({ description: 'Imported without its entry in the core catalog (spec 024)', required: false, example: true })
  missingReference?: boolean;

  @ApiProperty({
    type: [StyleAbilitySelectionDto],
    required: false,
    description: 'Fighting style skills only (spec 032): ranks allocated to the abilities of the style',
  })
  styleAbilities?: StyleAbilitySelectionDto[];

  @ApiProperty({ required: false, description: 'Fighting style skills only (spec 032): ranks not allocated to abilities', example: 2 })
  styleFreeRanks?: number;

  @ApiProperty({
    required: false,
    description: 'Fighting style skills only (spec 032): OB of the free ranks (+2 each, max +10)',
    example: 4,
  })
  styleFreeRanksBonus?: number;

  static fromEntity(skill: CharacterSkill): CharacterSkillDto {
    const dto = new CharacterSkillDto();
    dto.skillId = skill.skillId;
    dto.specialization = skill.specialization;
    dto.statistics = skill.statistics;
    dto.development = skill.development;
    dto.professional = skill.professional;
    dto.ranks = skill.ranks;
    dto.ranksDeveloped = skill.ranksDeveloped;
    dto.cultureRanks = skill.cultureRanks ?? 0;
    dto.devPointsSpent = { normal: skill.devPointsSpent?.normal ?? 0, bonus: skill.devPointsSpent?.bonus ?? 0 };
    dto.statBonus = skill.statBonus;
    dto.racialBonus = skill.racialBonus;
    dto.professionalBonus = skill.professionalBonus;
    dto.developmentBonus = skill.developmentBonus;
    dto.customBonus = skill.customBonus;
    dto.traitBonus = skill.traitBonus ?? 0;
    dto.totalBonus = skill.totalBonus;
    if (skill.missingReference) dto.missingReference = true;
    if (isFightingStyleSkill(skill.skillId)) {
      dto.styleAbilities = (skill.styleAbilities || []).map(a => ({ abilityId: a.abilityId, times: a.times, cost: a.cost }));
      dto.styleFreeRanks = freeStyleRanks(skill);
      dto.styleFreeRanksBonus = unallocatedStyleBonus(dto.styleFreeRanks);
    }
    return dto;
  }
}

export class CharacterSkillCreationDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ type: String, description: 'Specialization', example: 'cats' })
  @IsString()
  @IsOptional()
  specialization: string | null;

  @ApiProperty({ description: 'Ranks', example: 3 })
  @IsNumber()
  ranks: number;

  static fromEntity(skill: CharacterSkill): CharacterSkillCreationDto {
    const dto = new CharacterSkillCreationDto();
    dto.skillId = skill.skillId;
    dto.specialization = skill.specialization;
    dto.ranks = skill.ranks;
    return dto;
  }
}
