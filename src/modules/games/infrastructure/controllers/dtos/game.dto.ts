import { ApiProperty } from '@nestjs/swagger';
import { Game, GameOptions, GamePowerLevel, GameStatus } from 'src/modules/games/domain/entities/game';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

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

export class GameOptionsDto {
  @ApiProperty({ description: 'Experience multiplier', type: Number })
  experienceMultiplier: number;

  static fromEntity(entity: GameOptions): GameOptionsDto {
    const dto = new GameOptionsDto();
    dto.experienceMultiplier = entity.experienceMultiplier;
    return dto;
  }
}

export class GamePowerLevelDto {
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
