import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UpdateGameCommand } from 'src/modules/games/application/cqrs/commands/update-game.command';

export class UpdateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(gameId: string, dto: UpdateGameDto, userId: string, roles: string[]): UpdateGameCommand {
    return new UpdateGameCommand(gameId, dto.name, dto.description, userId, roles);
  }
}
