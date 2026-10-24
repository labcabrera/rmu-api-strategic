import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { UpdateFactionCommand } from '../../../application/cqrs/commands/update-faction.command.js';

/**
 * The gold and XP of a faction are not part of the PATCH (F-strategic-16): they change through add-gold and add-xp,
 * which only the owner of the game or an admin may call. A `management` field sent by a client is dropped.
 */
export class UpdateFactionDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign', required: false })
  @IsString()
  @IsOptional()
  name: string;

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

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(factionId: string, dto: UpdateFactionDto, userId: string, roles: string[]): UpdateFactionCommand {
    return new UpdateFactionCommand(factionId, dto.name, dto.shortDescription, dto.description, dto.imageUrl, userId, roles, dto.version);
  }
}
