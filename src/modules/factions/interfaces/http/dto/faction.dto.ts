import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Faction } from '../../../domain/aggregates/faction.js';
import { FactionManagement } from '../../../domain/value-objects/faction-management.vo.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { FactionNpcDto } from './faction-npc.dto.js';
import type { EntityAccess } from '../../../application/services/faction-access.service.js';
import type { Game } from '../../../../games/domain/aggregates/game.js';

export class FactionDto {
  @ApiProperty({ description: 'Version of optimistic concurrency: send it back in the PATCH to detect a concurrent change', example: 0 })
  version: number;

  id: string;
  gameId: string;
  name: string;
  management: FactionManagementDto;
  shortDescription: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;

  @ApiProperty({ type: [FactionNpcDto], description: 'Spec 055: NPCs of the faction' })
  npcs: FactionNpcDto[];

  @ApiProperty({ type: [String], description: 'Spec 072: the players of the game who change the faction' })
  players: string[];

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Spec 072: the names of its players, from the members of the game',
  })
  playerNames: Record<string, string>;

  @ApiProperty({
    enum: ['manage', 'write', 'read'],
    required: false,
    description: 'Spec 072: what the user can do with the faction (manage: masters; write: its players)',
  })
  access?: 'manage' | 'write' | 'read';

  /** The faction with the names of its players and the access of the user (spec 072). */
  static forAccess(entity: Faction, access: EntityAccess, game: Game | null): FactionDto {
    const dto = FactionDto.fromEntity(entity, game);
    if (access !== 'none') dto.access = access;
    return dto;
  }

  static fromEntity(entity: Faction, game: Game | null = null): FactionDto {
    const dto = new FactionDto();
    dto.version = entity.version;
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.name = entity.name;
    dto.management = FactionManagementDto.fromEntity(entity.management);
    dto.shortDescription = entity.shortDescription;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    dto.npcs = entity.npcs.map(npc => FactionNpcDto.fromEntity(npc));
    dto.players = [...entity.players];
    const names = new Map((game?.members ?? []).map(member => [member.userId, member.userName]));
    dto.playerNames = Object.fromEntries(entity.players.map(id => [id, names.get(id) ?? id]));
    return dto;
  }
}

export class FactionManagementDto {
  @ApiProperty()
  @IsNumber()
  availableGold: number;

  static fromEntity(entity: FactionManagement): FactionManagementDto {
    const dto = new FactionManagementDto();
    dto.availableGold = entity.availableGold;
    return dto;
  }

  static toEntity(dto: FactionManagementDto): FactionManagement {
    return new FactionManagement(dto.availableGold);
  }
}

export class FactionPageDto {
  @ApiProperty({
    type: [FactionDto],
    description: 'Factions',
  })
  content: FactionDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
