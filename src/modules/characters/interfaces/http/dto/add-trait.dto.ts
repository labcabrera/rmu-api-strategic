import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { AddTraitCommand } from '../../../application/cqrs/commands/add-trait.command.js';
import { DEV_POINTS_POOL_CHOICES, type DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';
import { MULTILINGUAL_SKILL_IDS, type MultilingualSkillId } from '../../../domain/services/traits/multilingual.js';
import { DEV_POINTS_POOL_DESCRIPTION } from './dev-points-pool.dto.js';

export class LanguageRanksDto {
  @ApiProperty({ enum: MULTILINGUAL_SKILL_IDS, description: 'Spoken or written language', example: 'language-spoken' })
  @IsIn(MULTILINGUAL_SKILL_IDS)
  skillId: MultilingualSkillId;

  @ApiProperty({ description: 'Language: a key of the language enumeration', example: 'common' })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiProperty({ description: 'Ranks of the talent in this skill', example: 5 })
  @IsInt()
  @Min(1)
  ranks: number;
}

export class AddTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiProperty({ type: Number, description: 'Trait tier', example: 2 })
  @IsNumber()
  @IsOptional()
  tier: number | undefined;

  @ApiProperty({ type: String, description: 'Trait value', example: 'body-development' })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  @ApiPropertyOptional({ enum: DEV_POINTS_POOL_CHOICES, default: 'auto', description: DEV_POINTS_POOL_DESCRIPTION })
  @IsOptional()
  @IsIn(DEV_POINTS_POOL_CHOICES)
  pool?: DevPointsPoolChoice;

  @ApiPropertyOptional({
    type: [LanguageRanksDto],
    description:
      'Multilingual only (workspace spec 076): 10 ranks in one language or 5 in each of two, split between spoken and written as the player likes',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => LanguageRanksDto)
  languageRanks?: LanguageRanksDto[];

  static toCommand(characterId: string, dto: AddTraitDto, userId: string, roles: string[]): AddTraitCommand {
    return new AddTraitCommand(
      characterId,
      dto.traitId,
      dto.tier,
      dto.specialization,
      userId,
      roles,
      dto.pool ?? 'auto',
      dto.languageRanks?.map(entry => ({ skillId: entry.skillId, specialization: entry.specialization, ranks: entry.ranks })),
    );
  }
}
