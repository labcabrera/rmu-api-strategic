import { ApiProperty } from '@nestjs/swagger';
import { ItemWeaponModeDto } from './item-weapon-mode.dto';
import { ItemWeapon } from 'src/modules/items/domain/value-objects/item-weapon.vo';

export class ItemWeaponDto {
  @ApiProperty({ description: 'Item identifier', type: String, required: true, example: 'item-001' })
  skillId: string;

  @ApiProperty({ description: 'Fumble value', type: Number, required: true, example: 1 })
  fumble: number;

  @ApiProperty({ description: 'Weapon modes', type: [ItemWeaponModeDto], required: true })
  modes: ItemWeaponModeDto[];

  static fromEntity(entity: ItemWeapon): ItemWeaponDto {
    const dto = new ItemWeaponDto();
    dto.skillId = entity.skillId;
    dto.fumble = entity.fumble;
    dto.modes = entity.modes.map((mode) => ItemWeaponModeDto.fromEntity(mode));
    return dto;
  }
}
