import { ApiProperty } from '@nestjs/swagger';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';

export class NamedEntityDto {
  @ApiProperty({ description: 'Entity identifier', minimum: 0, example: 'foo-entity-001', type: String })
  id: string;

  @ApiProperty({ description: 'Name', example: 'Foo name', type: String })
  name: string;

  static fromEntity(entity: NamedEntity): NamedEntityDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  static toEntity(dto: NamedEntityDto | undefined): NamedEntity | undefined {
    if (!dto) return undefined;
    return new NamedEntity(dto.id, dto.name);
  }
}
