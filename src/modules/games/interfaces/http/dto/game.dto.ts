import type { AccessType } from '../../../../shared/domain/entities/access-type.js';
import { ApiProperty } from '@nestjs/swagger';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { Game } from '../../../domain/aggregates/game.js';
import { GameOptionsDto } from './game-options.dto.js';
import { GamePowerLevelDto } from './game-power-level.dto.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';

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

  @ApiProperty({ description: 'Game short description', type: String, required: false })
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Game description', type: String, required: false })
  description: string | undefined;

  @ApiProperty({ description: 'Game image URL', type: String, required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  @ApiProperty({
    description: 'Who can read the game, its factions and characters: its owner (private) or everyone',
    enum: ['public', 'private'],
  })
  accessType: AccessType;

  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.version = entity.version;
    dto.id = entity.id;
    dto.name = entity.name;
    dto.realmId = entity.realmId;
    dto.realmName = entity.realmName;
    dto.status = entity.status;
    dto.options = GameOptionsDto.fromEntity(entity.options);
    dto.powerLevel = GamePowerLevelDto.fromEntity(entity.powerLevel);
    dto.shortDescription = entity.shortDescription;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    dto.accessType = entity.accessType;
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
