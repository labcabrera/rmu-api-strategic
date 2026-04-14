import { ApiProperty } from '@nestjs/swagger';
import { KeyValue } from 'src/modules/shared/domain/entities/key-value';

export class KeyValueDto {
  @ApiProperty({ description: 'Key code', example: 'foo' })
  key: string;

  @ApiProperty({ description: 'Value', example: 0 })
  value: number;

  static fromEntity(entity: KeyValue): KeyValueDto {
    const dto = new KeyValueDto();
    dto.key = entity.key;
    dto.value = entity.value;
    return dto;
  }
}
