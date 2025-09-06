import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
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
  @ApiProperty({ description: 'Experience multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  @IsNotEmpty()
  experienceMultiplier: number;

  @ApiProperty({ description: 'Fatigue multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  @IsNotEmpty()
  fatigueMultiplier: number;

  @ApiProperty({ description: 'Board scale multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  @IsNotEmpty()
  boardScaleMultiplier: number;

  @ApiProperty({ description: 'Game letality (custom bonus to all attacks)', type: Number, default: 0, example: 0 })
  @IsNumber()
  @IsNotEmpty()
  letality: number;

  static fromEntity(entity: GameOptions): GameOptionsDto {
    const dto = new GameOptionsDto();
    dto.experienceMultiplier = entity.experienceMultiplier;
    dto.fatigueMultiplier = entity.fatigueMultiplier;
    dto.boardScaleMultiplier = entity.boardScaleMultiplier;
    dto.letality = entity.letality;
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
