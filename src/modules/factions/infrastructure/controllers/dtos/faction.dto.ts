import { ApiProperty } from '@nestjs/swagger';
import { Faction, FactionManagement } from 'src/modules/factions/domain/entities/faction.entity';
import { PaginationDto } from 'src/modules/shared/infrastructure/controller/dto';

export class FactionDto {
  id: string;
  gameId: string;
  name: string;
  factionManagement: FactionManagementDto;
  description: string | undefined;

  static fromEntity(entity: Faction): FactionDto {
    const dto = new FactionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.factionManagement = FactionManagementDto.fromEntity(entity.management);
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
