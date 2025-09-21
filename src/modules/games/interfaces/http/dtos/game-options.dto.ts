import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { GameOptions } from 'src/modules/games/domain/value-objects/game-options.vo';

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

  static fromEntity(entity: GameOptions): GameOptionsDto {
    const dto = new GameOptionsDto();
    dto.experienceMultiplier = entity.experienceMultiplier;
    dto.fatigueMultiplier = entity.fatigueMultiplier;
    dto.boardScaleMultiplier = entity.boardScaleMultiplier;
    dto.letality = entity.letality;
    return dto;
  }
}
