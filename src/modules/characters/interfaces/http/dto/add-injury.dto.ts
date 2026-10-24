import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { AddInjuryCommand } from '../../../application/cqrs/commands/add-injury.command';
import { BODY_LOCATIONS, BODY_SIDES, INJURY_FLAGS, INJURY_SEVERITIES, INJURY_TYPES } from '../../../domain/value-objects/injury.vo';
import type { BodyLocation, BodySide, InjuryFlag, InjurySeverity, InjuryType } from '../../../domain/value-objects/injury.vo';

export class AddInjuryDto {
  @ApiProperty({ type: String, enum: INJURY_TYPES, example: 'bone' })
  @IsIn(INJURY_TYPES)
  @IsNotEmpty()
  type: InjuryType;

  @ApiPropertyOptional({ type: String, enum: INJURY_SEVERITIES, description: 'Derived from the penalty and the bleeding when missing' })
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

  @ApiProperty({ description: 'Penalty (stored as a negative value)', example: -30 })
  @IsInt()
  penalty: number;

  @ApiPropertyOptional({ description: 'Hits per round', example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  bleeding?: number;

  @ApiPropertyOptional({ enum: INJURY_FLAGS, isArray: true })
  @IsArray()
  @IsIn(INJURY_FLAGS, { each: true })
  @IsOptional()
  flags?: InjuryFlag[];

  @ApiPropertyOptional({ example: 'Broken left arm' })
  @IsString()
  @IsOptional()
  description?: string;

  static toCommand(characterId: string, dto: AddInjuryDto, userId: string, roles: string[]): AddInjuryCommand {
    return new AddInjuryCommand(
      characterId,
      {
        type: dto.type,
        severity: dto.severity,
        location: dto.location,
        side: dto.side,
        penalty: dto.penalty,
        bleeding: dto.bleeding,
        flags: dto.flags,
        description: dto.description,
        source: { kind: 'manual' },
      },
      userId,
      roles,
    );
  }
}
