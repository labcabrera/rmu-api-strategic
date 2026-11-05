import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional } from 'class-validator';
import {
  GameOptions,
  resolveOptions,
  STAT_GENERATIONS,
  TALENT_POLICIES,
  type StatGeneration,
  type TalentPolicy,
} from '../../../domain/value-objects/game-options.vo.js';

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
    description: 'Intense training (workspace spec 076): one skill per level may take more than two ranks, all of them at the second cost',
    type: Boolean,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  intenseTraining?: boolean;

  @ApiPropertyOptional({
    description: 'Deprecated alias of intenseTraining (workspace spec 076): accepted on input, never returned',
    type: Boolean,
    deprecated: true,
  })
  @IsOptional()
  @IsBoolean()
  allowThirdRank?: boolean;

  @ApiProperty({
    description: 'The game master allows keeping unspent development points for the next level (workspace spec 076)',
    type: Boolean,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowSavingDevPoints?: boolean;

  @ApiProperty({
    type: String,
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

  @ApiProperty({ type: String, description: 'Stat generation method', enum: STAT_GENERATIONS, required: false, default: 'roll' })
  @IsOptional()
  @IsIn(STAT_GENERATIONS)
  statGeneration?: StatGeneration;

  @ApiProperty({
    description: 'Open rounds: an action still unresolved at the end of a round carries over to the next one, keeping its action points',
    type: Boolean,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  openRounds?: boolean;

  /**
   * The options as the domain stores them: the deprecated allowThirdRank becomes intenseTraining (when it is not sent)
   * and is dropped, so that it is never stored again (workspace spec 076, plan 1.1).
   */
  static toEntity(dto: GameOptionsDto): GameOptionsDto;
  static toEntity(dto: GameOptionsDto | undefined): GameOptionsDto | undefined;
  static toEntity(dto: GameOptionsDto | undefined): GameOptionsDto | undefined {
    if (!dto) return dto;
    const { allowThirdRank, ...options } = dto;
    const result = Object.assign(new GameOptionsDto(), options);
    if (result.intenseTraining === undefined && allowThirdRank !== undefined) result.intenseTraining = allowThirdRank;
    return result;
  }

  static fromEntity(entity: GameOptions): GameOptionsDto {
    const resolved = resolveOptions(entity);
    const dto = new GameOptionsDto();
    dto.experienceMultiplier = entity.experienceMultiplier;
    dto.fatigueMultiplier = entity.fatigueMultiplier;
    dto.boardScaleMultiplier = entity.boardScaleMultiplier;
    dto.letality = entity.letality;
    dto.intenseTraining = resolved.intenseTraining;
    dto.allowSavingDevPoints = resolved.allowSavingDevPoints;
    dto.talentPolicy = resolved.talentPolicy;
    dto.bonusDevPointsCapAtCreation = resolved.bonusDevPointsCapAtCreation;
    dto.statGeneration = resolved.statGeneration;
    dto.openRounds = resolved.openRounds;
    return dto;
  }
}
