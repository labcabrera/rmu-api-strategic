import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CharacterEndurance } from '../../../domain/value-objects/character-endurance.vo.js';

export class CharacterEnduranceDto {
  @ApiProperty({ description: 'Custom bonus', example: 5, default: 0 })
  @IsNumber()
  customBonus: number;

  @ApiProperty({ description: 'Maximum endurance', example: 100 })
  max: number;

  @ApiProperty({ description: 'Current endurance', example: 80 })
  current: number;

  @ApiProperty({ description: 'Endurance accumulator', example: 20 })
  accumulator: number;

  @ApiProperty({
    description: 'Accumulated fatigue penalty, 0-50, shown as a negative modifier (workspace spec 077: recovered resting, 1 per minute)',
    example: 5,
  })
  fatiguePenalty: number;

  @ApiProperty({ description: 'Racial endurance bonus (with Body Development, the endurance bonus of a tactical game)', example: 0 })
  racialBonus: number;

  static fromEntity(endurance: CharacterEndurance): CharacterEnduranceDto {
    const dto = new CharacterEnduranceDto();
    dto.customBonus = endurance.customBonus;
    dto.max = endurance.max;
    dto.current = endurance.current;
    dto.accumulator = endurance.accumulator;
    dto.fatiguePenalty = endurance.fatiguePenalty ?? 0;
    dto.racialBonus = endurance.racialBonus ?? 0;
    return dto;
  }
}
