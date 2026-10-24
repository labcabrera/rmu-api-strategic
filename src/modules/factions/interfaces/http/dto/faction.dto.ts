import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Faction } from '../../../domain/aggregates/faction.js';
import { FactionManagement } from '../../../domain/value-objects/faction-management.vo.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';

export class FactionDto {
  @ApiProperty({ description: 'Version of optimistic concurrency: send it back in the PATCH to detect a concurrent change', example: 0 })
  version: number;

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
    dto.version = entity.version;
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
  @IsNumber()
  availableGold: number;

  @ApiProperty()
  @IsNumber()
  availableXP: number;

  static fromEntity(entity: FactionManagement): FactionManagementDto {
    const dto = new FactionManagementDto();
    dto.availableGold = entity.availableGold;
    dto.availableXP = entity.availableXP;
    return dto;
  }

  static toEntity(dto: FactionManagementDto): FactionManagement {
    return new FactionManagement(dto.availableXP, dto.availableGold);
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
