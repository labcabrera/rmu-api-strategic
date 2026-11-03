import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { GAME_MEMBER_ROLES, type GameMemberRole } from '../../../domain/value-objects/game-member.vo.js';

export class SetGameMemberDto {
  @ApiProperty({ enum: GAME_MEMBER_ROLES, description: 'master (co-master, only the owner), player or spectator' })
  @IsIn(GAME_MEMBER_ROLES)
  role: GameMemberRole;
}

export class JoinGameDto {
  @ApiProperty({ type: String, required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
