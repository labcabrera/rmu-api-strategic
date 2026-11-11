import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AmputateLimbCommand, StrenuousFailureCommand } from '../../../application/cqrs/commands/health-079.commands.js';
import type { AmputationResult } from '../../../application/cqrs/handlers/health-079.handlers.js';
import { AMPUTATION_METHODS, type AmputationMethod } from '../../../domain/services/healing/amputation-rules.js';
import { BODY_SIDES, type BodySide } from '../../../domain/value-objects/injury.vo.js';
import { LOST_LIMB_LOCATIONS, type LostLimbLocation } from '../../../domain/value-objects/lost-limb.vo.js';
import { CharacterDto } from './character.dto.js';
import { LostLimbDto } from './character-health.dto.js';
import { ExternalHealerDto } from './treat-injury.dto.js';

/** Workspace spec 079, C1: an amputation with a Medicine roll. */
export class AmputateLimbDto {
  @ApiProperty({ type: String, enum: AMPUTATION_METHODS, description: 'surgical (-50, hours) or emergency (-30, cauterized)' })
  @IsIn(AMPUTATION_METHODS)
  method: AmputationMethod;

  @ApiProperty({ type: String, enum: LOST_LIMB_LOCATIONS })
  @IsIn(LOST_LIMB_LOCATIONS)
  location: LostLimbLocation;

  @ApiProperty({ type: String, enum: BODY_SIDES })
  @IsIn(BODY_SIDES)
  side: BodySide;

  @ApiPropertyOptional({ description: 'Surgical only: the stump is cauterized (adds a burn injury). Emergency always is' })
  @IsBoolean()
  @IsOptional()
  cauterized?: boolean;

  @ApiPropertyOptional({ description: 'The injury that costs the limb: its bleeding and tourniquet end' })
  @IsString()
  @IsOptional()
  injuryId?: string;

  @ApiPropertyOptional({ description: 'Healer character of the same strategic game (the patient itself is allowed)' })
  @IsString()
  @IsOptional()
  healerCharacterId?: string;

  @ApiPropertyOptional({ type: ExternalHealerDto, description: 'External healer, when there is no healer character' })
  @ValidateNested()
  @Type(() => ExternalHealerDto)
  @IsOptional()
  healer?: ExternalHealerDto;

  @ApiProperty({ description: 'Open-ended Medicine roll', example: 84 })
  @IsInt()
  roll: number;

  @ApiPropertyOptional({ description: 'Difficulty modifier chosen by the game master; the one of the method by default' })
  @IsInt()
  @IsOptional()
  difficulty?: number;

  static toCommand(characterId: string, dto: AmputateLimbDto, userId: string, roles: string[]): AmputateLimbCommand {
    return new AmputateLimbCommand(
      characterId,
      dto.method,
      dto.location,
      dto.side,
      dto.cauterized,
      dto.injuryId,
      dto.healerCharacterId,
      dto.healer,
      dto.roll,
      dto.difficulty,
      userId,
      roles,
    );
  }
}

export class AmputationCriticalDto {
  @ApiProperty({ example: 'S' })
  criticalType: string;
  @ApiProperty({ example: 'D' })
  criticalSeverity: string;
  @ApiProperty({ description: 'Results to move on the table (one lower)', example: -1 })
  resultShift: number;
}

export class AmputationConsequenceDto {
  @ApiPropertyOptional({ type: AmputationCriticalDto, description: 'Failure: the critical the game master rolls' })
  critical?: AmputationCriticalDto;
  @ApiPropertyOptional({ type: Object, description: 'Absolute failure: system shock, death in `dice`d10 rounds' })
  systemShock?: { dice: number };
}

export class AmputationResultDto {
  @ApiProperty({ type: CharacterDto })
  character: CharacterDto;
  @ApiProperty({ type: LostLimbDto })
  lostLimb: LostLimbDto;
  @ApiProperty({ enum: ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'] })
  result: string;
  @ApiProperty()
  roll: number;
  @ApiProperty()
  difficulty: number;
  @ApiProperty()
  total: number;
  @ApiProperty({ type: [Object], description: 'The total entry by entry with its rules' })
  breakdown: object[];
  @ApiProperty({ type: [String] })
  injuryIds: string[];
  @ApiProperty({ type: AmputationConsequenceDto })
  consequence: AmputationConsequenceDto;

  static from(result: AmputationResult): AmputationResultDto {
    return Object.assign(new AmputationResultDto(), {
      character: CharacterDto.fromEntity(result.character),
      lostLimb: LostLimbDto.fromEntity(result.lostLimb),
      result: result.result,
      roll: result.roll,
      difficulty: result.difficulty,
      total: result.total,
      breakdown: result.breakdown,
      injuryIds: result.injuryIds,
      consequence: result.consequence,
    });
  }
}

/** Workspace spec 079, C2: a strenuous activity failed while the injury recovered. */
export class StrenuousFailureDto {
  @ApiPropertyOptional({ description: 'Absolute failure: the penalty left doubles', default: false })
  @IsBoolean()
  @IsOptional()
  absolute?: boolean;

  static toCommand(characterId: string, injuryId: string, dto: StrenuousFailureDto, userId: string, roles: string[]) {
    return new StrenuousFailureCommand(characterId, injuryId, dto.absolute ?? false, userId, roles);
  }
}
