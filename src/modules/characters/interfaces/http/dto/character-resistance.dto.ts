import { CharacterResistance } from '../../../domain/value-objects/character-resistances.vo.js';

export class CharacterResistanceDto {
  resistance: string;
  statBonus: number;
  racialBonus: number;
  realmBonus: number;
  customBonus: number;
  traitBonus: number;
  // +2 per character level
  levelBonus: number;
  totalBonus: number;

  static fromEntity(entity: CharacterResistance): CharacterResistanceDto {
    const dto = new CharacterResistanceDto();
    dto.resistance = entity.resistance;
    dto.statBonus = entity.statBonus;
    dto.racialBonus = entity.racialBonus;
    dto.realmBonus = entity.realmBonus;
    dto.customBonus = entity.customBonus;
    dto.traitBonus = entity.traitBonus ?? 0;
    dto.levelBonus = entity.levelBonus ?? 0;
    dto.totalBonus = entity.totalBonus;
    return dto;
  }
}
