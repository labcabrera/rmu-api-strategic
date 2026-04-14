import { ApiProperty } from '@nestjs/swagger';
import { ItemWeaponModeDto } from './item-weapon-mode.dto';
import { ItemInfo } from 'src/modules/items/domain/value-objects/item-info.vo';

export class ItemInfoDto {
  @ApiProperty({ description: 'Item identifier', type: String, required: true, example: 'item-001' })
  length: number | null;

  @ApiProperty({ description: 'Fumble value', type: Number, required: true, example: 1 })
  weight: number;

  @ApiProperty({ description: 'Weapon modes', type: [ItemWeaponModeDto], required: true })
  strength: number | null;

  @ApiProperty({ description: 'Whether the item is stackable', type: Boolean, required: true, example: false })
  stackable: boolean;

  static fromEntity(entity: ItemInfo): ItemInfoDto {
    const dto = new ItemInfoDto();
    dto.length = entity.length;
    dto.weight = entity.weight;
    dto.strength = entity.strength;
    dto.stackable = entity.stackable;
    return dto;
  }
}
