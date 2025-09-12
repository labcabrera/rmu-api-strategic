import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CharacterSkill } from 'src/modules/characters/domain/value-objects/character-skill.vo';
import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';

export class CharacterSkillDto {
  skillId: string;
  specialization: string | undefined;
  statistics: string[];
  professional: ProfessionalBonusType[] | undefined;
  ranks: number;
  statBonus: number;
  racialBonus: number;
  developmentBonus: number;
  professionalBonus: number;
  customBonus: number;
  totalBonus: number;

  static fromEntity(skill: CharacterSkill): CharacterSkillDto {
    const dto = new CharacterSkillDto();
    dto.skillId = skill.skillId;
    dto.specialization = skill.specialization;
    dto.statistics = skill.statistics;
    dto.professional = skill.professional;
    dto.ranks = skill.ranks;
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
