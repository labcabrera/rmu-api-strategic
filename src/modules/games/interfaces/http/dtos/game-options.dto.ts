import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional } from 'class-validator';
import {
  GameOptions,
  resolveOptions,
  STAT_GENERATIONS,
  TALENT_POLICIES,
  type StatGeneration,
  type TalentPolicy,
} from 'src/modules/games/domain/value-objects/game-options.vo';

export class GameOptionsDto {
  @ApiProperty({ description: 'Experience multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  experienceMultiplier: number;

  @ApiProperty({ description: 'Fatigue multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  fatigueMultiplier: number;

  @ApiProperty({ description: 'Board scale multiplier', type: Number, default: 1.0, example: 1.0 })
  @IsNumber()
  boardScaleMultiplier: number;

  @ApiProperty({ description: 'Game letality (custom bonus to all attacks)', type: Number, default: 0, example: 0 })
  @IsNumber()
  letality: number;

  @ApiProperty({
    description: 'Allows a third rank of the same skill in a single level, at the cost of the second one',
    type: Boolean,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowThirdRank?: boolean;

  @ApiProperty({
    description:
      "Talent purchase policy: 'free' (any points, any level), 'race-points-at-creation' (new talents only at creation and only with bonus points), 'flaw-points-at-creation' (at creation talents are paid only with the points returned by flaws)",
    enum: TALENT_POLICIES,
    required: false,
    default: 'free',
  })
  @IsOptional()
  @IsIn(TALENT_POLICIES)
  talentPolicy?: TalentPolicy;

  @ApiProperty({
    description: 'When true, the bonus development points per level limit also applies to talents bought at creation',
    type: Boolean,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  bonusDevPointsCapAtCreation?: boolean;

  @ApiProperty({ description: 'Stat generation method', enum: STAT_GENERATIONS, required: false, default: 'roll' })
  @IsOptional()
  @IsIn(STAT_GENERATIONS)
  statGeneration?: StatGeneration;

  static fromEntity(entity: GameOptions): GameOptionsDto {
    const resolved = resolveOptions(entity);
    const dto = new GameOptionsDto();
    dto.experienceMultiplier = entity.experienceMultiplier;
    dto.fatigueMultiplier = entity.fatigueMultiplier;
    dto.boardScaleMultiplier = entity.boardScaleMultiplier;
    dto.letality = entity.letality;
    dto.allowThirdRank = resolved.allowThirdRank;
    dto.talentPolicy = resolved.talentPolicy;
    dto.bonusDevPointsCapAtCreation = resolved.bonusDevPointsCapAtCreation;
    dto.statGeneration = resolved.statGeneration;
    return dto;
  }
}
