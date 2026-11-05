import { ApiProperty } from '@nestjs/swagger';
import { CharacterEquipment, type EquipmentSlot } from '../../../domain/value-objects/character-equipment.vo.js';

/** Workspace spec 077, decision B1.5. */
export class CharacterLoadDto {
  @ApiProperty({ description: 'Weight (lb) of the equipped items, worn armor scaled to the body it was made for', example: 45 })
  worn: number;

  @ApiProperty({ description: 'Weight (lb) of the carried items that are not equipped', example: 30 })
  carried: number;

  @ApiProperty({ description: 'Worn plus carried, in % of the body weight (0 with no body weight)', example: 34 })
  percent: number;
}

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

  @ApiProperty({ description: 'Sum of the Enc % of the worn armor pieces that still protect (spec 077)', example: 25 })
  armorEncumbrance: number;

  @ApiProperty({ type: CharacterLoadDto, description: 'Load breakdown (spec 077)' })
  load: CharacterLoadDto;

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
    dto.armorEncumbrance = entity.armorEncumbrance ?? 0;
    dto.load = entity.load ? { ...entity.load } : { worn: 0, carried: entity.weight ?? 0, percent: 0 };
    return dto;
  }
}
