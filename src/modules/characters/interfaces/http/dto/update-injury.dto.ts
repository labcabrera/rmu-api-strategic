import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { UpdateInjuryCommand } from '../../../application/cqrs/commands/update-injury.command.js';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  BODY_SIDES,
  INJURY_FLAGS,
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  INJURY_TYPES,
  PACES,
} from '../../../domain/value-objects/injury.vo.js';
import type { Pace } from '../../../domain/value-objects/character-movement.vo.js';
import type {
  BleedingControl,
  BodyLocation,
  BodySide,
  InjuryFlag,
  InjurySeverity,
  InjuryStatus,
  InjuryType,
} from '../../../domain/value-objects/injury.vo.js';

export class UpdateInjuryPermanentDto {
  @ApiPropertyOptional({ description: 'Permanent penalty (negative)', example: -10 })
  @IsInt()
  penalty: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  roll?: number;
}

/** Workspace spec 068: limits of a splinted or cast limb, set by the game master. */
export class UpdateInjuryLimitsDto {
  @ApiPropertyOptional({ type: String, enum: PACES, nullable: true })
  @IsIn(PACES)
  @IsOptional()
  pace?: Pace | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  limbUnusable?: boolean;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  maneuverPenaltyFactor?: number | null;
}

export class UpdateInjuryDto {
  @ApiPropertyOptional({ type: String, enum: INJURY_TYPES })
  @IsIn(INJURY_TYPES)
  @IsOptional()
  type?: InjuryType;

  @ApiPropertyOptional({ type: String, enum: INJURY_SEVERITIES })
  @IsIn(INJURY_SEVERITIES)
  @IsOptional()
  severity?: InjurySeverity;

  @ApiPropertyOptional({ type: String, enum: BODY_LOCATIONS })
  @IsIn(BODY_LOCATIONS)
  @IsOptional()
  location?: BodyLocation;

  @ApiPropertyOptional({ type: String, enum: BODY_SIDES })
  @IsIn(BODY_SIDES)
  @IsOptional()
  side?: BodySide;

  @ApiPropertyOptional({ example: -20 })
  @IsInt()
  @IsOptional()
  penalty?: number;

  @ApiPropertyOptional({ example: -30 })
  @IsInt()
  @IsOptional()
  initialPenalty?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  bleeding?: number;

  @ApiPropertyOptional({ type: String, enum: BLEEDING_CONTROLS })
  @IsIn(BLEEDING_CONTROLS)
  @IsOptional()
  bleedingControl?: BleedingControl;

  @ApiPropertyOptional({ enum: INJURY_FLAGS, isArray: true })
  @IsArray()
  @IsIn(INJURY_FLAGS, { each: true })
  @IsOptional()
  flags?: InjuryFlag[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: UpdateInjuryPermanentDto, description: 'Permanent part (e.g. 100% of an untreated injury)' })
  @ValidateNested()
  @Type(() => UpdateInjuryPermanentDto)
  @IsOptional()
  permanent?: UpdateInjuryPermanentDto;

  @ApiPropertyOptional({ type: String, enum: INJURY_STATUSES })
  @IsIn(INJURY_STATUSES)
  @IsOptional()
  status?: InjuryStatus;

  @ApiPropertyOptional({
    type: UpdateInjuryLimitsDto,
    nullable: true,
    description: 'Limits of a splint or a cast (spec 068); null removes them',
  })
  @ValidateNested()
  @Type(() => UpdateInjuryLimitsDto)
  @IsOptional()
  limits?: UpdateInjuryLimitsDto | null;

  static toCommand(characterId: string, injuryId: string, dto: UpdateInjuryDto, userId: string, roles: string[]): UpdateInjuryCommand {
    return new UpdateInjuryCommand(
      characterId,
      injuryId,
      {
        type: dto.type,
        severity: dto.severity,
        location: dto.location,
        side: dto.side,
        penalty: dto.penalty,
        initialPenalty: dto.initialPenalty,
        bleeding: dto.bleeding,
        bleedingControl: dto.bleedingControl,
        flags: dto.flags,
        description: dto.description,
        permanent: dto.permanent ? { penalty: -Math.abs(dto.permanent.penalty) || 0, roll: dto.permanent.roll } : undefined,
        status: dto.status,
        limits: UpdateInjuryDto.toLimits(dto.limits),
      },
      userId,
      roles,
    );
  }

  private static toLimits(limits: UpdateInjuryLimitsDto | null | undefined) {
    if (limits === null) return null;
    if (!limits) return undefined;
    return {
      ...(limits.pace !== undefined ? { pace: limits.pace } : {}),
      ...(limits.limbUnusable !== undefined ? { limbUnusable: limits.limbUnusable } : {}),
      ...(limits.maneuverPenaltyFactor !== undefined ? { maneuverPenaltyFactor: limits.maneuverPenaltyFactor } : {}),
    };
  }
}
