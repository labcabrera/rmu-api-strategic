import { CharacterResistance } from 'src/modules/characters/domain/value-objects/character-resistances.vo';

export class CharacterResistanceDto {
  resistance: string;
  statBonus: number;
  racialBonus: number;
  realmBonus: number;
  customBonus: number;
  totalBonus: number;

  static fromEntity(entity: CharacterResistance): CharacterResistanceDto {
    const dto = new CharacterResistanceDto();
    dto.resistance = entity.resistance;
    dto.statBonus = entity.statBonus;
    dto.racialBonus = entity.racialBonus;
    dto.realmBonus = entity.realmBonus;
    dto.customBonus = entity.customBonus;
    dto.totalBonus = entity.totalBonus;
    return dto;
  }
}
