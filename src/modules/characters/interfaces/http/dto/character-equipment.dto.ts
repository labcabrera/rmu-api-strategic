import { CharacterEquipment, EquipmentSlot } from 'src/modules/characters/domain/value-objects/character-equipment.vo';

export class CharacterEquipmentDto {
  slots: Record<EquipmentSlot, string | null>;
  weight: number | undefined;
  weightAllowance: number | undefined;
  encumbrancePenalty: number;
  maneuverPenalty: number;
  baseManeuverPenalty: number;
  rangedPenalty: number;
  perceptionPenalty: number;
  movementBaseDifficulty: string | undefined;

  static fromEntity(entity: CharacterEquipment): CharacterEquipmentDto {
    const dto = new CharacterEquipmentDto();
    dto.slots = entity.slots || {};
    dto.weight = entity.weight;
    dto.weightAllowance = entity.weightAllowance;
    dto.encumbrancePenalty = entity.encumbrancePenalty;
    dto.baseManeuverPenalty = entity.baseManeuverPenalty;
    dto.maneuverPenalty = entity.maneuverPenalty;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perceptionPenalty = entity.perceptionPenalty;
    dto.movementBaseDifficulty = entity.movementBaseDifficulty;
    return dto;
  }
}
