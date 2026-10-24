import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateFactionCommand } from '../../../application/cqrs/commands/update-faction.command.js';
import { FactionManagementDto } from './faction.dto.js';

export class UpdateFactionDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign', required: false })
  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()
  @IsObject()
  management: FactionManagementDto | undefined;

  @ApiProperty({ type: String, description: 'Faction short description', example: 'Game short description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({ type: String, description: 'Faction description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  @ApiProperty({ type: String, description: 'Faction image URL', example: 'foo/bar/images.png' })
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
