import { ApiProperty } from '@nestjs/swagger';
import { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';

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
