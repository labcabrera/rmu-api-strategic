import type { AccessType } from '../../../../shared/domain/entities/access-type.js';
import { ApiProperty } from '@nestjs/swagger';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { Game } from '../../../domain/aggregates/game.js';
import { GameOptionsDto } from './game-options.dto.js';
import { GamePowerLevelDto } from './game-power-level.dto.js';
import { GameCalendarDto } from './game-calendar.dto.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import {
  GAME_ACCESS_LEVELS,
  GAME_MEMBER_ROLES,
  type GameAccessLevel,
  type GameJoinRequest,
  type GameMember,
  type GameMemberRole,
  gameAccessAtLeast,
} from '../../../domain/value-objects/game-member.vo.js';

export class GameMemberDto {
  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  userName: string;

  @ApiProperty({ enum: GAME_MEMBER_ROLES })
  role: GameMemberRole;

  @ApiProperty({ type: Date })
  joinedAt: Date;

  static fromEntity(member: GameMember): GameMemberDto {
    return Object.assign(new GameMemberDto(), { ...member });
  }
}

export class GameJoinRequestDto {
  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  userName: string;

  @ApiProperty({ type: String, nullable: true })
  message: string | null;

  @ApiProperty({ type: Date })
  requestedAt: Date;

  static fromEntity(request: GameJoinRequest): GameJoinRequestDto {
    return Object.assign(new GameJoinRequestDto(), { ...request });
  }
}

export class GameMembersDto {
  @ApiProperty({ type: [GameMemberDto] })
  members: GameMemberDto[];

  @ApiProperty({ type: [GameJoinRequestDto], nullable: true, description: 'Only for the masters of the game (or the own request)' })
  joinRequests: GameJoinRequestDto[] | null;
}

export class GameDto {
  @ApiProperty({ description: 'Version of optimistic concurrency: send it back in the PATCH to detect a concurrent change', example: 0 })
  version: number;

  @ApiProperty({ description: 'Game identifier', type: String })
  id: string;

  @ApiProperty({ description: 'Game name', type: String })
  name: string;

  @ApiProperty({ description: 'Game realm identifier', type: String })
  realmId: string;

  @ApiProperty({ description: 'Game realm name', type: String })
  realmName: string;

  @ApiProperty({ description: 'Game status', type: String })
  status: GameStatus;

  @ApiProperty({ description: 'Game options', type: GameOptionsDto })
  options: GameOptionsDto;

  @ApiProperty({ description: 'Game power level', type: GamePowerLevelDto })
  powerLevel: GamePowerLevelDto;

  @ApiProperty({ description: 'Calendar of the campaign (spec 065)', type: GameCalendarDto })
  calendar: GameCalendarDto;

  @ApiProperty({ description: 'Game short description', type: String, required: false })
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Game description', type: String, required: false })
  description: string | undefined;

  @ApiProperty({ description: 'Game image URL', type: String, required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  @ApiProperty({
    description: 'Private: only its members read it. Public: anybody reads its cover and can ask to join (spec 071)',
    enum: ['public', 'private'],
  })
  accessType: AccessType;

  @ApiProperty({ description: 'What the user can do with the game (spec 071)', enum: GAME_ACCESS_LEVELS })
  access: GameAccessLevel;

  @ApiProperty({ description: 'Members of the game, for its members', type: [GameMemberDto], required: false })
  members?: GameMemberDto[];

  @ApiProperty({ description: 'Requests to join, for the masters', type: [GameJoinRequestDto], required: false })
  joinRequests?: GameJoinRequestDto[];

  @ApiProperty({ description: 'Whether the owner still reads the realm (only in the GET by id, for the masters)', required: false })
  realmReadable?: boolean;

  /** `access` decides what goes out: members for the members, join requests for the masters (spec 071). */
  static fromEntity(entity: Game, access: GameAccessLevel = 'owner', realmReadable?: boolean): GameDto {
    const dto = new GameDto();
    dto.version = entity.version;
    dto.id = entity.id;
    dto.name = entity.name;
    dto.realmId = entity.realmId;
    dto.realmName = entity.realmName;
    dto.status = entity.status;
    dto.options = GameOptionsDto.fromEntity(entity.options);
    dto.powerLevel = GamePowerLevelDto.fromEntity(entity.powerLevel);
    dto.calendar = GameCalendarDto.fromEntity(entity.calendar);
    dto.shortDescription = entity.shortDescription;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    dto.accessType = entity.accessType;
    dto.access = access;
    if (gameAccessAtLeast(access, 'spectator')) dto.members = entity.members.map(member => GameMemberDto.fromEntity(member));
    if (gameAccessAtLeast(access, 'master')) dto.joinRequests = entity.joinRequests.map(request => GameJoinRequestDto.fromEntity(request));
    if (realmReadable !== undefined) dto.realmReadable = realmReadable;
    return dto;
  }
}

export class GamePageDto {
  @ApiProperty({
    type: [GameDto],
    description: 'Games',
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
