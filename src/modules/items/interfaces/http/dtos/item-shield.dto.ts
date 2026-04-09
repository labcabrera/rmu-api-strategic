import { ApiProperty } from '@nestjs/swagger';
import { ItemShield } from 'src/modules/items/domain/value-objects/item-shield.vo';

export class ItemShieldDto {
  @ApiProperty({ description: 'Defensive bonus', type: Number, required: true, example: 20 })
  db: number;

  @ApiProperty({ description: 'Block count', type: Number, required: true, example: 2 })
  blockCount: number;

  static fromEntity(entity: ItemShield): ItemShieldDto {
    const dto = new ItemShieldDto();
    dto.db = entity.db;
    dto.blockCount = entity.blockCount;
    return dto;
  }
}
