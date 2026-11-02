import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { TreatInjuryCommand } from '../../../application/cqrs/commands/treat-injury.command.js';
import { CAST_SUPPORTS, HEALING_TYPES, TREATMENT_PROCEDURES } from '../../../domain/value-objects/injury.vo.js';
import type { CastSupport, HealingType, TreatmentProcedure } from '../../../domain/value-objects/injury.vo.js';
import { DIFFICULTIES, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { TreatmentDifficulty } from '../../../domain/services/healing/injury-treatment-rules.js';

export class ExternalHealerDto {
  @ApiProperty({ example: 'Village healer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Medicine bonus', example: 45 })
  @IsInt()
  bonus: number;

  @ApiPropertyOptional({ description: 'Herbalism bonus', example: 30 })
  @IsInt()
  @IsOptional()
  herbalismBonus?: number;
}

export class HerbalismRollDto {
  @ApiProperty({ description: 'Unmodified Herbalism roll', example: 72 })
  @IsInt()
  roll: number;

  @ApiPropertyOptional({ description: 'Character of the game that rolls Herbalism (the healer by default)' })
  @IsString()
  @IsOptional()
  healerCharacterId?: string;

  @ApiPropertyOptional({ description: 'Herbalism bonus (overrides the character one)', example: 30 })
  @IsInt()
  @IsOptional()
  bonus?: number;
}

export class TreatInjuryDto {
  @ApiProperty({ type: String, enum: TREATMENT_PROCEDURES, example: 'splint' })
  @IsIn(TREATMENT_PROCEDURES)
  procedure: TreatmentProcedure;

  @ApiPropertyOptional({ description: 'Healer character of the same strategic game (the patient itself is allowed)' })
  @IsString()
  @IsOptional()
  healerCharacterId?: string;

  @ApiPropertyOptional({ type: ExternalHealerDto, description: 'External healer, when there is no healer character' })
  @ValidateNested()
  @Type(() => ExternalHealerDto)
  @IsOptional()
  healer?: ExternalHealerDto;

  @ApiPropertyOptional({ description: 'Unmodified Medicine roll (not needed for magic)', example: 84 })
  @IsInt()
  @IsOptional()
  roll?: number;

  @ApiPropertyOptional({
    description: 'Difficulty modifier chosen by the game master. Without it the server computes it from the core table',
    example: 0,
  })
  @IsInt()
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({ type: HerbalismRollDto, description: 'Herbalism roll: a success adds a bonus to the Medicine roll' })
  @ValidateNested()
  @Type(() => HerbalismRollDto)
  @IsOptional()
  herbalism?: HerbalismRollDto;

  @ApiPropertyOptional({ type: String, enum: HEALING_TYPES, description: 'Overrides the type of healing derived from the result' })
  @IsIn(HEALING_TYPES)
  @IsOptional()
  healingType?: HealingType;

  @ApiPropertyOptional({
    description:
      'Herb item of the patient or of a character of its game (spec 062): +25 to Medicine and, when it treats the injury, ' +
      '+50 to the recovery roll (+75 with magic). One dose is spent',
  })
  @IsString()
  @IsOptional()
  herbItemId?: string;

  @ApiPropertyOptional({
    type: String,
    enum: CAST_SUPPORTS,
    description: 'Cast on a leg (spec 068): the fastest pace is that of the cast alone, with a cane or with crutches',
  })
  @IsIn(CAST_SUPPORTS)
  @IsOptional()
  castSupport?: CastSupport;

  @ApiPropertyOptional({
    description: 'Salve (spec 068): recovery modifier chosen by the game master, within the range of the core tables',
    example: 10,
  })
  @IsInt()
  @Min(-100)
  @Max(100)
  @IsOptional()
  salveModifier?: number;

  static toCommand(characterId: string, injuryId: string, dto: TreatInjuryDto, userId: string, roles: string[]): TreatInjuryCommand {
    return new TreatInjuryCommand(
      characterId,
      injuryId,
      dto.procedure,
      dto.healerCharacterId,
      dto.healer ? { name: dto.healer.name, bonus: dto.healer.bonus, herbalismBonus: dto.healer.herbalismBonus } : undefined,
      dto.roll,
      dto.difficulty,
      dto.herbalism
        ? { roll: dto.herbalism.roll, healerCharacterId: dto.herbalism.healerCharacterId, bonus: dto.herbalism.bonus }
        : undefined,
      dto.healingType,
      userId,
      roles,
      dto.herbItemId,
      dto.castSupport,
      dto.salveModifier,
    );
  }
}

export class TreatmentDifficultyQueryDto {
  @ApiProperty({ type: String, enum: TREATMENT_PROCEDURES, example: 'stitches' })
  @IsIn(TREATMENT_PROCEDURES)
  procedure: TreatmentProcedure;
}

export class TreatmentDifficultyDto {
  @ApiProperty({ type: String, enum: TREATMENT_PROCEDURES })
  procedure: TreatmentProcedure;

  @ApiPropertyOptional({ type: String, enum: DIFFICULTIES, description: 'Difficulty key, the head step included' })
  grade?: Difficulty;

  @ApiProperty({ description: 'Steps harder because the injury is on the head', example: 0 })
  headSteps: number;

  @ApiProperty({ description: 'Modifier of the difficulty, the head step included', example: 0 })
  base: number;

  @ApiProperty({ description: 'Extra modifier of cauterizing a bleeding wound', example: 0 })
  bleedingModifier: number;

  @ApiProperty({ description: 'Difficulty modifier of the Medicine roll', example: 0 })
  difficulty: number;

  @ApiProperty({ description: 'A row of the core table matched (false: the medium default)' })
  matched: boolean;

  @ApiProperty({ description: 'The procedure applies to the injury (without an override, a treatment that does not is refused)' })
  applicable: boolean;

  static fromResult(result: TreatmentDifficulty): TreatmentDifficultyDto {
    return Object.assign(new TreatmentDifficultyDto(), result);
  }
}
