import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Faction } from '../../../domain/aggregates/faction.js';
import { FactionManagement } from '../../../domain/value-objects/faction-management.vo.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { FactionNpcDto } from './faction-npc.dto.js';
import type { FactionView } from '../../../application/services/faction-access.service.js';

/** What the readers of a game who are not members of the faction see of it (spec 071, decision 12). */
export class FactionCoverDto {
  @ApiProperty() id: string;
  @ApiProperty() gameId: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, required: false }) shortDescription: string | undefined;
  @ApiProperty({ type: String, required: false }) description: string | undefined;
  @ApiProperty({ type: String, required: false }) imageUrl: string | undefined;
  @ApiProperty({ type: String, nullable: true }) leaderId: string | null;
  @ApiProperty({ enum: ['cover'] }) access: 'cover';
  @ApiProperty({ enum: [true] }) summary: true;

  static fromEntity(entity: Faction): FactionCoverDto {
    return Object.assign(new FactionCoverDto(), {
      id: entity.id,
      gameId: entity.gameId,
      name: entity.name,
      shortDescription: entity.shortDescription,
      description: entity.description,
      imageUrl: entity.imageUrl,
      leaderId: entity.leaderId,
      access: 'cover' as const,
      summary: true as const,
    });
  }
}

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

  @ApiProperty({ type: String, nullable: true, description: 'Spec 071: the player who spends the gold of the faction' })
  leaderId: string | null;

  @ApiProperty({ enum: ['full'], required: false, description: 'Spec 071: what the user sees of the faction (in the GETs)' })
  access?: 'full';

  /** The full faction, or its cover for a reader who is not a member of it (spec 071). */
  static forView(entity: Faction, view: FactionView): FactionDto | FactionCoverDto {
    if (view === 'cover') return FactionCoverDto.fromEntity(entity);
    return Object.assign(FactionDto.fromEntity(entity), { access: 'full' as const });
  }

  static fromEntity(entity: Faction): FactionDto {
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
    dto.leaderId = entity.leaderId;
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
