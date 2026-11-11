import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AwardGroupXpCommand, XP_EVENT_TYPES, type XpEventType } from '../../../application/cqrs/commands/award-group-xp.command.js';
import type { GroupXpResult } from '../../../application/cqrs/handlers/award-group-xp.handler.js';
import { GameTimeLogErrorDto } from '../../../../games/interfaces/http/dto/game-time-log.dto.js';

/** At most this experience at a time: the largest award of the book is a few thousand points. */
export const MAX_GROUP_XP = 100000;

export class GroupXpDto {
  @ApiProperty({
    description: 'Experience each character gets (the whole amount, not a share)',
    minimum: 1,
    maximum: MAX_GROUP_XP,
    example: 500,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_GROUP_XP)
  xp: number;

  @ApiPropertyOptional({ type: [String], description: 'Characters of the game that get it; every live character when missing or empty' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @IsOptional()
  characterIds?: string[];

  @ApiPropertyOptional({ enum: XP_EVENT_TYPES, description: 'Kind of event the experience is for (Core Law §12.4); informative' })
  @IsIn(XP_EVENT_TYPES)
  @IsOptional()
  eventType?: XpEventType;

  static toCommand(gameId: string, dto: GroupXpDto, userId: string, roles: string[]): AwardGroupXpCommand {
    return new AwardGroupXpCommand(gameId, dto.xp, dto.characterIds, dto.eventType, userId, roles);
  }
}

export class GroupXpCharacterDto {
  @ApiProperty()
  characterId: string;
  @ApiProperty()
  name: string;
  @ApiPropertyOptional()
  xpBefore?: number;
  @ApiPropertyOptional()
  xpAfter?: number;
  @ApiPropertyOptional()
  level?: number;
  @ApiPropertyOptional({ description: 'Level the experience allows' })
  availableLevel?: number;
  @ApiPropertyOptional({ type: GameTimeLogErrorDto, description: 'Why the character did not get the experience' })
  error?: GameTimeLogErrorDto;
}

export class GroupXpResultDto {
  @ApiProperty()
  gameId: string;
  @ApiProperty()
  xp: number;
  @ApiProperty({ enum: XP_EVENT_TYPES, nullable: true })
  eventType: XpEventType | null;
  @ApiProperty({ type: [GroupXpCharacterDto] })
  characters: GroupXpCharacterDto[];

  static from(result: GroupXpResult): GroupXpResultDto {
    return Object.assign(new GroupXpResultDto(), result);
  }
}
