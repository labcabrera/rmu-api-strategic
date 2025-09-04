import { CharacterResistance } from 'src/modules/characters/domain/entities/character-resistances.entity';

export class CharacterResistanceDto {
  resistance: string;
  statBonus: number;
  racialBonus: number;
  customBonus: number;
  totalBonus: number;

  static fromEntity(entity: CharacterResistance): CharacterResistanceDto {
    const dto = new CharacterResistanceDto();
    dto.resistance = entity.resistance;
    dto.statBonus = entity.statBonus;
    dto.racialBonus = entity.racialBonus;
    dto.customBonus = entity.customBonus;
    dto.totalBonus = entity.totalBonus;
    return dto;
  }
}
