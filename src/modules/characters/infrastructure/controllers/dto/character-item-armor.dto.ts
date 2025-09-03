import { CharacterItemArmor } from 'src/modules/characters/domain/entities/character-item.entity';

export class CharacterItemArmorDto {
  slot: string;
  at: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;

  static fromEntity(entity: CharacterItemArmor): CharacterItemArmorDto {
    const dto = new CharacterItemArmorDto();
    dto.slot = entity.slot;
    dto.at = entity.at;
    dto.enc = entity.enc;
    dto.maneuver = entity.maneuver;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perception = entity.perception;
    return dto;
  }
}
