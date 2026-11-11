import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import {
  GAME_POWER_LEVEL_PRESETS,
  GamePowerLevel,
  type GamePowerLevelPreset,
  resolvePowerLevel,
} from '../../../domain/value-objects/game-power-level.vo.js';

export class GamePowerLevelDto {
  @ApiProperty({ description: 'Base development points', type: Number })
  @IsNumber()
  baseDevPoints: number;

  @ApiProperty({ description: 'Stat random min', type: Number })
  @IsNumber()
  statRandomMin: number;

  @ApiProperty({ description: 'Stat boost potential', type: Number })
  @IsNumber()
  statBoostPotential: number;

  @ApiProperty({ description: 'Stat boost temporary', type: Number })
  @IsNumber()
  statBoostTemporary: number;

  @ApiProperty({ description: 'Stat creation boost', type: Number })
  @IsNumber()
  statCreationBoost: number;

  @ApiProperty({ description: 'Stat creation swap', type: Number })
  @IsNumber()
  statCreationSwap: number;

  @ApiProperty({ description: 'Maximum development points for a single talent', type: Number, required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTraitCost?: number;

  @ApiProperty({
    description: 'Maximum bonus development points (race and game master) spendable in a single level',
    type: Number,
    required: false,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  raceDevPointsPerLevel?: number;

  @ApiProperty({
    description: 'Bonus development points granted by the game master, added to the race pool at creation',
    type: Number,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  creationBonusDevPoints?: number;

  @ApiProperty({ description: 'Budget of the stat point-buy generation', type: Number, required: false, default: 15 })
  @IsOptional()
  @IsInt()
  statPoints?: number;

  @ApiProperty({ description: 'Number of knacks per profession', type: Number, required: false, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  knackCount?: number;

  @ApiProperty({ description: 'Bonus of each knack', type: Number, required: false, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  knackBonus?: number;

  @ApiProperty({
    description: 'Power level preset the values came from (Core Law table 12-1, workspace spec 079); informative, the values stay editable',
    enum: GAME_POWER_LEVEL_PRESETS,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(GAME_POWER_LEVEL_PRESETS)
  preset?: GamePowerLevelPreset | null;

  @ApiProperty({
    description: 'Percent of the power points recovered every rest period of 2 hours (workspace spec 079); 10 by default',
    type: Number,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  ppRecoveryPercent?: number;

  static fromEntity(entity: GamePowerLevel): GamePowerLevelDto {
    const resolved = resolvePowerLevel(entity);
    const dto = new GamePowerLevelDto();
    dto.baseDevPoints = entity.baseDevPoints;
    dto.statRandomMin = entity.statRandomMin;
    dto.statBoostPotential = entity.statBoostPotential;
    dto.statBoostTemporary = entity.statBoostTemporary;
    dto.statCreationBoost = entity.statCreationBoost;
    dto.statCreationSwap = entity.statCreationSwap;
    dto.maxTraitCost = resolved.maxTraitCost;
    dto.raceDevPointsPerLevel = resolved.raceDevPointsPerLevel;
    dto.creationBonusDevPoints = resolved.creationBonusDevPoints;
    dto.statPoints = resolved.statPoints;
    dto.knackCount = resolved.knackCount;
    dto.knackBonus = resolved.knackBonus;
    dto.preset = resolved.preset;
    dto.ppRecoveryPercent = resolved.ppRecoveryPercent;
    return dto;
  }
}
