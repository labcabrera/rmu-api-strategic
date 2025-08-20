import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateGameCommand } from 'src/modules/games/application/commands/create-game.command';

export class CreateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Realm identifier from core module', example: 'lotr' })
  @IsString()
  @IsNotEmpty()
  realm: string;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]): CreateGameCommand {
    return {
      ...dto,
      userId,
      roles,
    };
  }
}
