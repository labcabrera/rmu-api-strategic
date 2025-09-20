import { ApiProperty } from '@nestjs/swagger';
import type { GameStatus } from 'src/modules/games/domain/value-objects/game-status.vo';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';
import { GameOptionsDto } from './game-options.dto';
import { GamePowerLevelDto } from './game-power-level-dto';

export class GameDto {
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

  @ApiProperty({ description: 'Game description', type: String, required: false })
  description: string | undefined;

  @ApiProperty({ description: 'Game owner', type: String })
  owner: string;

  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.realmId = entity.realmId;
    dto.realmName = entity.realmName;
    dto.status = entity.status;
    dto.options = GameOptionsDto.fromEntity(entity.options);
    dto.powerLevel = GamePowerLevelDto.fromEntity(entity.powerLevel);
    dto.description = entity.description;
    dto.owner = entity.owner;
    return dto;
  }
}

export class GamePageDto {
  @ApiProperty({
    type: [GameDto],
    description: 'Games',
    isArray: true,
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
