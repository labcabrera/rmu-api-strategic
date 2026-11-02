import { ApiProperty } from '@nestjs/swagger';
import { ItemWeaponMode } from '../../../domain/value-objects/item-weapon-mode.vo.js';
import { ItemWeaponRangeDto } from './item-weapon-range.dto.js';

export class ItemWeaponModeDto {
  @ApiProperty({ description: 'Item identifier', type: String, required: true, example: 'item-001' })
  type: string;

  attackTypes: string[];
  attackTable: string;
  fumbleTable: string;
  sizeAdjustment: number;
  ranges: ItemWeaponRangeDto[] | null;

  @ApiProperty({ description: 'OB modifier of the mode, such as an improvised weapon penalty (spec 041)', required: false })
  obModifier?: number;

  static fromEntity(entity: ItemWeaponMode): ItemWeaponModeDto {
    const dto = new ItemWeaponModeDto();
    dto.type = entity.type;
    dto.attackTypes = entity.attackTypes;
    dto.attackTable = entity.attackTable;
    dto.fumbleTable = entity.fumbleTable;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.ranges = entity.ranges;
    if (entity.obModifier) dto.obModifier = entity.obModifier;
    return dto;
  }
}
