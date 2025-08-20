import { ApiProperty } from '@nestjs/swagger';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

export class FactionDto {
  id: string;
  gameId: string;
  name: string;
  description: string | undefined;

  static fromEntity(entity: Faction): FactionDto {
    const dto = new FactionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.name = entity.name;
    dto.description = entity.description;
    return dto;
  }
}

export class FactionPageDto {
  @ApiProperty({
    type: [FactionDto],
    description: 'Factions',
    isArray: true,
  })
  content: FactionDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
