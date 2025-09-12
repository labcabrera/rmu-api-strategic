import { ApiProperty } from '@nestjs/swagger';
import { CharacterHP } from 'src/modules/characters/domain/value-objects/character-hp.vo';

export class CharacterHPDto {
  @ApiProperty({ description: 'Maximum HP', example: 100 })
  max: number;

  @ApiProperty({ description: 'Current HP', example: 80 })
  current: number;

  static fromEntity(hp: CharacterHP): CharacterHPDto {
    const dto = new CharacterHPDto();
    dto.max = hp.max;
    dto.current = hp.current;
    return dto;
  }
}
