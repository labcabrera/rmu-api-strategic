import { ApiProperty } from '@nestjs/swagger';
import { ItemArmor } from 'src/modules/items/domain/value-objects/item-armor.vo';

export class ItemArmorDto {
  @ApiProperty({ description: 'Armor slot', type: String, required: true, example: 'head' })
  slot: string;

  at: number;

  enc: number;

  maneuver: number;

  rangedPenalty: number;

  perception: number;

  baseDifficulty: string;

  static fromEntity(entity: ItemArmor): ItemArmorDto {
    const dto = new ItemArmorDto();
    dto.slot = entity.slot;
    dto.at = entity.at;
    dto.enc = entity.enc;
    dto.maneuver = entity.maneuver;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perception = entity.perception;
    dto.baseDifficulty = entity.baseDifficulty;
    return dto;
  }
}
