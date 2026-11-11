import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TRAIT_ACQUISITION_TYPES, type TraitAcquisitionType } from '../../../domain/value-objects/character-trait.vo.js';
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

/** Workspace spec 077, C11: the prerequisite the game master grants (training or milestone). */
export class TraitPrerequisiteDto {
  @ApiProperty({ enum: TRAIT_ACQUISITION_TYPES, description: 'Prerequisite type of the catalog met by the new tiers', example: 'training' })
  @IsIn(TRAIT_ACQUISITION_TYPES)
  type: TraitAcquisitionType;

  @ApiPropertyOptional({ description: 'What the game master writes about it', example: 'Trained by the guild' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Workspace spec 077, C11: the talent of the character a flaw is taken with. */
export class TraitLinkDto {
  @ApiProperty({ description: 'Talent of the character', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiPropertyOptional({ description: 'Specialization of the talent', example: 'perception' })
  @IsOptional()
  @IsString()
  specialization?: string;
}

/** Workspace spec 077, C12. */
export class TraitRestrictionDto {
  @ApiProperty({ description: 'The situations the trait acts in', example: 'Only underground' })
  @IsString()
  @MaxLength(500)
  note: string;
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

  @ApiPropertyOptional({
    type: TraitPrerequisiteDto,
    description:
      'Game option talentPurchaseRules (spec 077): the prerequisite the new tiers meet; training and milestone only by the game master',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TraitPrerequisiteDto)
  prerequisite?: TraitPrerequisiteDto;

  @ApiPropertyOptional({ type: TraitLinkDto, description: 'Flaws only (spec 077): the talent it is taken with, among its Possible Flaws' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TraitLinkDto)
  linkedTo?: TraitLinkDto;

  @ApiPropertyOptional({
    type: TraitRestrictionDto,
    description: 'Game master only (spec 077): the trait only acts in some situations; it costs half and its sheet effects do not apply',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TraitRestrictionDto)
  restricted?: TraitRestrictionDto;

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
      {
        ...(dto.prerequisite
          ? { prerequisite: { type: dto.prerequisite.type, ...(dto.prerequisite.note ? { note: dto.prerequisite.note } : {}) } }
          : {}),
        ...(dto.linkedTo
          ? {
              linkedTo: {
                traitId: dto.linkedTo.traitId,
                ...(dto.linkedTo.specialization ? { specialization: dto.linkedTo.specialization } : {}),
              },
            }
          : {}),
        ...(dto.restricted ? { restricted: { note: dto.restricted.note } } : {}),
      },
    );
  }
}
