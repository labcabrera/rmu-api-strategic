import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PassTimeCommand } from '../../../application/cqrs/commands/pass-time.command.js';
import type { PassTimeResult } from '../../../application/cqrs/handlers/pass-time.handler.js';
import { MAX_PASS_DAYS } from '../../../../games/domain/value-objects/game-calendar.vo.js';
import { PASS_TIME_ACTIVITIES, type PassTimeActivity } from '../../../../games/domain/value-objects/game-time-log-entry.vo.js';
import { GameDto } from '../../../../games/interfaces/http/dto/game.dto.js';
import { GameTimeLogCharacterDto } from '../../../../games/interfaces/http/dto/game-time-log.dto.js';

export class PassTimeCharacterDto {
  @ApiProperty()
  @IsString()
  characterId: string;

  @ApiProperty({ enum: PASS_TIME_ACTIVITIES, description: 'full-rest, rest (default) or excluded' })
  @IsIn(PASS_TIME_ACTIVITIES)
  activity: PassTimeActivity;
}

export class PassTimeDto {
  @ApiProperty({ minimum: 0, maximum: MAX_PASS_DAYS, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PASS_DAYS)
  days: number;

  @ApiProperty({ minimum: 0, maximum: 23, example: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hours: number;

  @ApiPropertyOptional({ maxLength: 500, example: 'Journey to Bree' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ type: [PassTimeCharacterDto], description: 'Activity per character; the ones not listed rest' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassTimeCharacterDto)
  @IsOptional()
  characters?: PassTimeCharacterDto[];

  @ApiPropertyOptional({ description: 'Calculate without storing anything (preview)', default: false })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @ApiProperty({ description: 'Version of the game the client read: a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version: number;

  static toCommand(gameId: string, dto: PassTimeDto, userId: string, roles: string[]): PassTimeCommand {
    return new PassTimeCommand(
      gameId,
      dto.days,
      dto.hours,
      dto.note,
      dto.characters ?? [],
      dto.dryRun ?? false,
      dto.version,
      userId,
      roles,
    );
  }
}

export class PassTimeResultDto {
  @ApiProperty({ type: GameDto, description: 'The game with its calendar after the step (unchanged on a dry run)' })
  game: GameDto;
  @ApiProperty()
  fromDay: number;
  @ApiProperty()
  toDay: number;
  @ApiProperty()
  days: number;
  @ApiProperty()
  hours: number;
  @ApiProperty()
  dryRun: boolean;
  @ApiProperty({ type: [GameTimeLogCharacterDto] })
  characters: GameTimeLogCharacterDto[];
  @ApiPropertyOptional()
  logEntryId?: string;

  static from(result: PassTimeResult): PassTimeResultDto {
    return Object.assign(new PassTimeResultDto(), { ...result, game: GameDto.fromEntity(result.game) });
  }
}
