import { ApiProperty } from '@nestjs/swagger';
import { ItemWeaponRange } from 'src/modules/items/domain/value-objects/item-weapon-range.vo';

export class ItemWeaponRangeDto {
  @ApiProperty({ description: 'From', type: Number, required: true, example: '0' })
  from: number;

  @ApiProperty({ description: 'To', type: Number, required: true, example: '30' })
  to: number;

  @ApiProperty({ description: 'Bonus', type: Number, required: true, example: '10' })
  bonus: number;

  static fromEntity(entity: ItemWeaponRange): ItemWeaponRangeDto {
    const dto = new ItemWeaponRangeDto();
    dto.from = entity.from;
    dto.to = entity.to;
    dto.bonus = entity.bonus;
    return dto;
  }
}
