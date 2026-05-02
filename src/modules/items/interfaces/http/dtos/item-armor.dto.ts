import { ApiProperty } from '@nestjs/swagger';
import { ItemArmor } from 'src/modules/items/domain/value-objects/item-armor.vo';

export class ItemArmorDto {
  @ApiProperty({ description: 'Armor slot', type: String, required: true, example: 'head' })
  slot: string;

  at: number;

  enc: number;

  maneuverPenalty: number;

  rangedPenalty: number;

  perceptionPenalty: number;

  baseDifficulty: string;

  static fromEntity(entity: ItemArmor): ItemArmorDto {
    const dto = new ItemArmorDto();
    dto.slot = entity.slot;
    dto.at = entity.at;
    dto.enc = entity.enc;
    dto.maneuverPenalty = entity.maneuverPenalty;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perceptionPenalty = entity.perceptionPenalty;
    dto.baseDifficulty = entity.baseDifficulty;
    return dto;
  }
}
