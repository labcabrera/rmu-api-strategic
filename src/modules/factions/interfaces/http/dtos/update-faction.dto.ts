import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateFactionCommand } from 'src/modules/factions/application/cqrs/commands/update-faction.command';
import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { FactionManagementDto } from './faction.dto';

export class UpdateFactionDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  management: FactionManagementDto | undefined;

  @ApiProperty({ description: 'Faction short description', example: 'Game short description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Faction description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  @ApiProperty({ description: 'Faction image URL', example: 'http://example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl: string | undefined;

  static toCommand(factionId: string, dto: UpdateFactionDto, userId: string, roles: string[]): UpdateFactionCommand {
    return new UpdateFactionCommand(
      factionId,
      dto.name,
      dto.management ? FactionManagementDto.toEntity(dto.management) : undefined,
      dto.shortDescription,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
    );
  }
}
