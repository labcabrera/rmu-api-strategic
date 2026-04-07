import { ApiProperty } from '@nestjs/swagger';
import { CharacterInitiative } from 'src/modules/characters/domain/value-objects/character-initiative.vo';

export class CharacterInitiativeDto {
  @ApiProperty({ description: 'Initiative modifiers', example: { stat: 2, trait: 1, penalty: -1 }, required: true })
  modifiers: Record<string, number>;

  @ApiProperty({ description: 'Total initiative bonus', example: 2 })
  totalBonus: number;

  static fromEntity(initiative: CharacterInitiative): CharacterInitiativeDto {
    const dto = new CharacterInitiativeDto();
    dto.modifiers = initiative.modifiers;
    dto.totalBonus = initiative.totalBonus;
    return dto;
  }
}
