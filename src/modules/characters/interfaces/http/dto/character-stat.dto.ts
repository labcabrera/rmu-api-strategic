import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CharacterStat } from 'src/modules/characters/domain/value-objects/character-stat.vo';

export class CharacterStatDto {
  potential: number;
  temporary: number;
  modifiers: Record<string, number>;
  totalBonus: number;

  static fromEntity(stat: CharacterStat): CharacterStatDto {
    const dto = new CharacterStatDto();
    dto.potential = stat.potential;
    dto.temporary = stat.temporary;
    dto.modifiers = stat.modifiers;
    dto.totalBonus = stat.totalBonus;
    return dto;
  }
}

export class CharacterStatCreationDto {
  @ApiProperty({ description: 'Potential stat value', example: 90 })
  @IsNumber()
  potential: number;

  @ApiProperty({ description: 'Temporary stat value', example: 75 })
  @IsNumber()
  temporary: number;
}
