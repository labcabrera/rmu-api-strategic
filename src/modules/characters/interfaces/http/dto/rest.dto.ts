import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { RestCharacterCommand } from '../../../application/cqrs/commands/rest-character.command.js';

export class RestDto {
  @ApiPropertyOptional({
    description: 'Minutes of rest (workspace spec 077): fatigue recovers one point per minute of the whole rest',
    example: 45,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  minutes?: number;

  @ApiPropertyOptional({ description: 'Hours of rest (hits per complete rest period)', example: 8 })
  @IsInt()
  @Min(0)
  @IsOptional()
  hours?: number;

  @ApiPropertyOptional({ description: 'Days of rest (injury counters and hits)', example: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  days?: number;

  @ApiPropertyOptional({ description: 'Complete rest with proper facilities: each day counts double', example: false })
  @IsBoolean()
  @IsOptional()
  fullRest?: boolean;

  static toCommand(characterId: string, dto: RestDto, userId: string, roles: string[]): RestCharacterCommand {
    return new RestCharacterCommand(characterId, dto.hours ?? 0, dto.days ?? 0, dto.fullRest ?? false, userId, roles, dto.minutes ?? 0);
  }
}
