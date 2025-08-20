import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateFactionCommand } from 'src/modules/factions/application/commands/create-faction.command';

export class CreateFactionDto {
  @ApiProperty({ description: 'Strategic game identifier', example: 'strategic-game-01' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Faction name', example: 'Mordor faction' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Faction description', example: 'A faction from Mordor' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(dto: CreateFactionDto, userId: string, roles: string[]): CreateFactionCommand {
    const command = new CreateFactionCommand();
    command.name = dto.name;
    command.gameId = dto.gameId;
    command.description = dto.description;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
