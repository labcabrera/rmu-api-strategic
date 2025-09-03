import { CharacterEquipment } from '../../../domain/entities/character.entity';

export class CharacterEquipmentDto {
  mainHand: string | undefined;
  offHand: string | undefined;
  body: string | undefined;
  head: string | undefined;
  arms: string | undefined;
  legs: string | undefined;
  weight: number | undefined;
  encumbrance: number;
  maneuverPenalty: number;
  rangedPenalty: number;
  perceptionPenalty: number;
  movementBaseDifficulty: string | undefined;

  static fromEntity(entity: CharacterEquipment): CharacterEquipmentDto {
    const dto = new CharacterEquipmentDto();
    dto.mainHand = entity.mainHand;
    dto.offHand = entity.offHand;
    dto.body = entity.body;
    dto.head = entity.head;
    dto.arms = entity.arms;
    dto.legs = entity.legs;
    dto.weight = entity.weight;
    dto.encumbrance = entity.encumbrance;
    dto.maneuverPenalty = entity.maneuverPenalty;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perceptionPenalty = entity.perceptionPenalty;
    dto.movementBaseDifficulty = entity.movementBaseDifficulty;
    return dto;
  }
}
