import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UpdateFactionCommand } from 'src/modules/factions/application/commands/update-faction.command';

export class UpdateFactionDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(factionId: string, dto: UpdateFactionDto, userId: string, roles: string[]): UpdateFactionCommand {
    return new UpdateFactionCommand(factionId, dto.name, dto.description, userId, roles);
  }
}
