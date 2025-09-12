import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { UpdateFactionCommand } from 'src/modules/factions/application/cqrs/commands/update-faction.command';

export class UpdateFactionDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Available gold for the faction', type: Number, example: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  availableGold: number | undefined;

  @ApiProperty({ description: 'Available XP for the faction', type: Number, example: 200000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  availableXP: number | undefined;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(factionId: string, dto: UpdateFactionDto, userId: string, roles: string[]): UpdateFactionCommand {
    const command = new UpdateFactionCommand();
    command.factionId = factionId;
    command.name = dto.name;
    command.availableGold = dto.availableGold;
    command.availableXP = dto.availableXP;
    command.description = dto.description;
    command.userId = userId;
    command.roles = roles;
    return command;
  }
}
