import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { CreateFactionCommand } from 'src/modules/factions/application/cqrs/commands/create-faction.command';
import { FactionManagementDto } from './faction.dto';

export class CreateFactionDto {
  @ApiProperty({ description: 'Strategic game identifier', example: 'strategic-game-01' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Faction name', example: 'Mordor faction' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Faction management details', type: FactionManagementDto })
  @Type(() => FactionManagementDto)
  @IsOptional()
  @IsObject()
  management: FactionManagementDto;

  @ApiProperty({ description: 'Available XP for the faction', type: Number, example: 200000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  availableXP: number | undefined;

  @ApiProperty({ description: 'Faction short description', example: 'Faction short description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Faction description', example: 'A faction from Mordor' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(dto: CreateFactionDto, userId: string, roles: string[]): CreateFactionCommand {
    return new CreateFactionCommand(dto.gameId, dto.name, dto.management, dto.shortDescription, dto.description, userId, roles);
  }
}
