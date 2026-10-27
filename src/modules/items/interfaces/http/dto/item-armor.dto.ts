import { ApiProperty } from '@nestjs/swagger';
import { ItemArmor } from '../../../domain/value-objects/item-armor.vo.js';

export class ItemArmorDto {
  @ApiProperty({ description: 'Armor slot', type: String, required: true, example: 'head' })
  slot: string;

  at: number;

  enc: number;

  maneuverPenalty: number;

  rangedPenalty: number;

  perceptionPenalty: number;

  baseDifficulty: string;

  @ApiProperty({ description: 'Slots it covers (a full suit covers the four, spec 041)', type: [String], required: false })
  coverage?: string[];

  @ApiProperty({ description: 'Light, medium or heavy piece (spec 041)', type: String, required: false })
  class?: string;

  static fromEntity(entity: ItemArmor): ItemArmorDto {
    const dto = new ItemArmorDto();
    dto.slot = entity.slot;
    dto.at = entity.at;
    dto.enc = entity.enc;
    dto.maneuverPenalty = entity.maneuverPenalty;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perceptionPenalty = entity.perceptionPenalty;
    dto.baseDifficulty = entity.baseDifficulty;
    if (entity.coverage?.length) dto.coverage = [...entity.coverage];
    if (entity.class) dto.class = entity.class;
    return dto;
  }
}
