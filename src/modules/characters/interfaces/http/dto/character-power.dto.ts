import { ApiProperty } from '@nestjs/swagger';
import { CharacterPower } from 'src/modules/characters/domain/value-objects/character-power.vo';

export class CharacterPowerDto {
  @ApiProperty({ description: 'Maximum power', example: 100 })
  max: number;

  @ApiProperty({ description: 'Current power', example: 80 })
  current: number;

  static fromEntity(power: CharacterPower): CharacterPowerDto {
    const dto = new CharacterPowerDto();
    dto.max = power.max;
    dto.current = power.current;
    return dto;
  }
}
