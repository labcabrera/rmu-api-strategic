import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import {
  type GameTimeLogEntry,
  type GameTimeLogType,
  PASS_TIME_ACTIVITIES,
  type PassTimeActivity,
} from '../../../domain/value-objects/game-time-log-entry.vo.js';

export class GameTimeLogErrorDto {
  @ApiProperty({ example: 'version-conflict' })
  code: string;
  @ApiProperty()
  message: string;
}

export class GameTimeLogCharacterDto {
  @ApiProperty()
  characterId: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ enum: PASS_TIME_ACTIVITIES })
  activity: PassTimeActivity;
  @ApiPropertyOptional({ type: Object, description: 'Result of the rest: hits, power points, injuries and poisonings' })
  result?: Record<string, unknown>;
  @ApiPropertyOptional({ type: GameTimeLogErrorDto, description: 'Why the rest was not applied' })
  error?: GameTimeLogErrorDto;
}

export class GameTimeLogEntryDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  gameId: string;
  @ApiProperty({ enum: ['pass-time', 'adjust'] })
  type: GameTimeLogType;
  @ApiProperty({ description: 'Day of the campaign before the step' })
  fromDay: number;
  @ApiProperty({ description: 'Day of the campaign after the step' })
  toDay: number;
  @ApiProperty()
  days: number;
  @ApiProperty()
  hours: number;
  @ApiPropertyOptional()
  note?: string;
  @ApiProperty({ type: [GameTimeLogCharacterDto] })
  characters: GameTimeLogCharacterDto[];
  @ApiProperty()
  userId: string;
  @ApiProperty()
  createdAt: string;

  static fromEntity(entry: GameTimeLogEntry): GameTimeLogEntryDto {
    return Object.assign(new GameTimeLogEntryDto(), entry);
  }
}

export class GameTimeLogPageDto {
  @ApiProperty({ type: [GameTimeLogEntryDto] })
  content: GameTimeLogEntryDto[];
  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
