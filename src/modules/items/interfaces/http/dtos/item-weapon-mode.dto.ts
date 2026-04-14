import { ApiProperty } from '@nestjs/swagger';
import { ItemWeaponMode } from 'src/modules/items/domain/value-objects/item-weapon-mode.vo';
import { ItemWeaponRangeDto } from './item-weapon-range.dto';

export class ItemWeaponModeDto {
  @ApiProperty({ description: 'Item identifier', type: String, required: true, example: 'item-001' })
  type: string;

  attackTypes: string[];
  attackTable: string;
  fumbleTable: string;
  sizeAdjustment: number;
  ranges: ItemWeaponRangeDto[] | null;

  static fromEntity(entity: ItemWeaponMode): ItemWeaponModeDto {
    const dto = new ItemWeaponModeDto();
    dto.type = entity.type;
    dto.attackTypes = entity.attackTypes;
    dto.attackTable = entity.attackTable;
    dto.fumbleTable = entity.fumbleTable;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.ranges = entity.ranges;
    return dto;
  }
}
