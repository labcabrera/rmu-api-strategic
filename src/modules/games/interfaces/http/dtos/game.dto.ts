import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { GameOptions } from 'src/modules/games/domain/value-objects/game-options.vo';
import { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';
import { GameStatus } from 'src/modules/games/domain/value-objects/game-status.vo';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';
import { GameOptionsDto } from './game-options.dto';

export class GameDto {
  id: string;
  name: string;
  realm: string;
  status: GameStatus;
  options: GameOptionsDto;
  powerLevel: GamePowerLevelDto;
  description: string | undefined;
  owner: string;

  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.realm = entity.realm;
    dto.status = entity.status;
    dto.options = GameOptionsDto.fromEntity(entity.options);
    dto.powerLevel = GamePowerLevelDto.fromEntity(entity.powerLevel);
    dto.description = entity.description;
    dto.owner = entity.owner;
    return dto;
  }
}

export class GamePowerLevelDto {
  @ApiProperty({ description: 'Base development points', type: Number })
  baseDevPoints: number;

  @ApiProperty({ description: 'Stat random min', type: Number })
  statRandomMin: number;

  @ApiProperty({ description: 'Stat boost potential', type: Number })
  statBoostPotential: number;

  @ApiProperty({ description: 'Stat boost temporary', type: Number })
  statBoostTemporary: number;

  @ApiProperty({ description: 'Stat creation boost', type: Number })
  statCreationBoost: number;

  @ApiProperty({ description: 'Stat creation swap', type: Number })
  statCreationSwap: number;

  static fromEntity(entity: GamePowerLevel): GamePowerLevelDto {
    const dto = new GamePowerLevelDto();
    dto.baseDevPoints = entity.baseDevPoints;
    dto.statRandomMin = entity.statRandomMin;
    dto.statBoostPotential = entity.statBoostPotential;
    dto.statBoostTemporary = entity.statBoostTemporary;
    dto.statCreationBoost = entity.statCreationBoost;
    dto.statCreationSwap = entity.statCreationSwap;
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
