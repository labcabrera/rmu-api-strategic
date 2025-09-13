import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CharacterSkill } from 'src/modules/characters/domain/value-objects/character-skill.vo';
import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';

export class CharacterSkillDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  skillId: string;

  @ApiProperty({ description: 'Specialization', example: 'cats' })
  specialization: string | undefined;

  @ApiProperty({ description: 'Associated statistics', example: ['WIS', 'CHA'] })
  statistics: string[];

  @ApiProperty({ description: 'Development values', example: [1, 2] })
  development: number[];

  @ApiProperty({ description: 'Professional bonuses' })
  professional: ProfessionalBonusType[] | undefined;

  @ApiProperty({ description: 'Ranks', example: 3 })
  ranks: number;

  @ApiProperty({ description: 'Ranks developed this level', example: 1 })
  ranksDeveloped: number;

  @ApiProperty({ description: 'Stat bonus', example: 2 })
  statBonus: number;

  @ApiProperty({ description: 'Racial bonus', example: 1 })
  racialBonus: number;

  @ApiProperty({ description: 'Development bonus', example: 2 })
  developmentBonus: number;

  @ApiProperty({ description: 'Professional bonus', example: 3 })
  professionalBonus: number;

  @ApiProperty({ description: 'Custom bonus', example: 5 })
  customBonus: number;

  @ApiProperty({ description: 'Total bonus', example: 10 })
  totalBonus: number;

  static fromEntity(skill: CharacterSkill): CharacterSkillDto {
    const dto = new CharacterSkillDto();
    dto.skillId = skill.skillId;
    dto.specialization = skill.specialization;
    dto.statistics = skill.statistics;
    dto.development = skill.development;
    dto.professional = skill.professional;
    dto.ranks = skill.ranks;
    dto.ranksDeveloped = skill.ranksDeveloped;
    dto.statBonus = skill.statBonus;
    dto.racialBonus = skill.racialBonus;
    dto.professionalBonus = skill.professionalBonus;
    dto.developmentBonus = skill.developmentBonus;
    dto.customBonus = skill.customBonus;
    dto.totalBonus = skill.totalBonus;
    return dto;
  }
}

export class CharacterSkillCreationDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ description: 'Specialization', example: 'cats' })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  @ApiProperty({ description: 'Ranks', example: 3 })
  @IsNumber()
  ranks: number;

  @ApiProperty({ description: 'Custom bonus', example: 5 })
  @IsNumber()
  @IsOptional()
  customBonus: number;

  static fromEntity(skill: CharacterSkill): CharacterSkillCreationDto {
    const dto = new CharacterSkillCreationDto();
    dto.skillId = skill.skillId;
    dto.specialization = skill.specialization;
    dto.ranks = skill.ranks;
    dto.customBonus = skill.customBonus;
    return dto;
  }
}
