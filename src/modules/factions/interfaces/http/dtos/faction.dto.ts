import { ApiProperty } from '@nestjs/swagger';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

export class FactionDto {
  id: string;
  gameId: string;
  name: string;
  management: FactionManagementDto;
  shortDescription: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;

  static fromEntity(entity: Faction): FactionDto {
    const dto = new FactionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.name = entity.name;
    dto.management = FactionManagementDto.fromEntity(entity.management);
    dto.shortDescription = entity.shortDescription;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    return dto;
  }
}

export class FactionManagementDto {
  @ApiProperty()
  availableGold: number;

  @ApiProperty()
  availableXP: number;

  static fromEntity(entity: FactionManagement): FactionManagementDto {
    const dto = new FactionManagementDto();
    dto.availableGold = entity.availableGold;
    dto.availableXP = entity.availableXP;
    return dto;
  }

  static toEntity(dto: FactionManagementDto): FactionManagement {
    return new FactionManagement(dto.availableGold, dto.availableXP);
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
