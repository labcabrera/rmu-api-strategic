import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { UpdateFactionCommand } from '../../../application/cqrs/commands/update-faction.command.js';
import { MAX_FACTION_NPCS } from '../../../domain/value-objects/faction-npc.vo.js';
import { FactionNpcInputDto } from './faction-npc.dto.js';

/**
 * The gold of a faction is not part of the PATCH (F-strategic-16): it changes through add-gold,
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

  @ApiPropertyOptional({
    type: [FactionNpcInputDto],
    description: 'Spec 055: the whole list of NPCs of the faction, which replaces the stored one',
  })
  @IsArray()
  @ArrayMaxSize(MAX_FACTION_NPCS)
  @ValidateNested({ each: true })
  @Type(() => FactionNpcInputDto)
  @IsOptional()
  npcs?: FactionNpcInputDto[];

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(factionId: string, dto: UpdateFactionDto, userId: string, roles: string[]): UpdateFactionCommand {
    return new UpdateFactionCommand(
      factionId,
      dto.name,
      dto.shortDescription,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
      dto.version,
      dto.npcs?.map(npc => ({ id: npc.id, npcId: npc.npcId, name: npc.name, count: npc.count, notes: npc.notes })),
    );
  }
}
