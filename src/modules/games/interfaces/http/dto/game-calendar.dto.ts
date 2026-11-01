import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { GameCalendar, START_DATE_MAX_LENGTH } from '../../../domain/value-objects/game-calendar.vo.js';

/** Calendar of a campaign (workspace spec 065). */
export class GameCalendarDto {
  @ApiProperty({ description: 'Start date of the campaign, free text ("" when there is none)', example: '3 Víressë, 1640 T.A.' })
  startDate: string;

  @ApiProperty({ description: 'Whole days elapsed since the start', example: 36 })
  elapsedDays: number;

  @ApiProperty({ description: 'Loose hours of the current day (0–23)', example: 8 })
  elapsedHours: number;

  @ApiProperty({ description: 'Current day of the campaign: elapsedDays + 1', example: 37 })
  currentDay: number;

  static fromEntity(calendar: GameCalendar): GameCalendarDto {
    const dto = new GameCalendarDto();
    dto.startDate = calendar.startDate;
    dto.elapsedDays = calendar.elapsedDays;
    dto.elapsedHours = calendar.elapsedHours;
    dto.currentDay = calendar.currentDay;
    return dto;
  }
}

export class CreateGameCalendarDto {
  @ApiPropertyOptional({ description: 'Start date of the campaign, free text', example: '3 Víressë, 1640 T.A.' })
  @IsString()
  @MaxLength(START_DATE_MAX_LENGTH)
  @IsOptional()
  startDate?: string;
}

export class UpdateGameCalendarDto extends CreateGameCalendarDto {
  @ApiPropertyOptional({ description: 'Correction of the elapsed days: it applies no effects on the characters', example: 36 })
  @IsInt()
  @Min(0)
  @IsOptional()
  elapsedDays?: number;
}
