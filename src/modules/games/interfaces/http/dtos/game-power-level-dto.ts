import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { DEFAULT_MAX_TRAIT_COST, GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';

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

  @ApiProperty({ description: 'Maximum development points for a single talent', type: Number, required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTraitCost?: number;

  static fromEntity(entity: GamePowerLevel): GamePowerLevelDto {
    const dto = new GamePowerLevelDto();
    dto.baseDevPoints = entity.baseDevPoints;
    dto.statRandomMin = entity.statRandomMin;
    dto.statBoostPotential = entity.statBoostPotential;
    dto.statBoostTemporary = entity.statBoostTemporary;
    dto.statCreationBoost = entity.statCreationBoost;
    dto.statCreationSwap = entity.statCreationSwap;
    dto.maxTraitCost = entity.maxTraitCost ?? DEFAULT_MAX_TRAIT_COST;
    return dto;
  }
}
