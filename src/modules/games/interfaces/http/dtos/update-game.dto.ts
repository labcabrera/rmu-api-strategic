import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateGameCommand } from 'src/modules/games/application/cqrs/commands/update-game.command';
import { GameOptionsDto } from './game-options.dto';
import { GamePowerLevelDto } from './game-power-level-dto';

export class UpdateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game options', type: GameOptionsDto })
  @IsOptional()
  @IsNotEmpty()
  @IsObject()
  options: GameOptionsDto | undefined;

  @ApiProperty({ description: 'Game power level', type: GamePowerLevelDto })
  @IsOptional()
  @IsNotEmpty()
  @IsObject()
  powerLevel: GamePowerLevelDto | undefined;

  @ApiProperty({ description: 'Game short description', example: 'Game short description' })
  @IsString()
  @IsOptional()
  shortDescription: string | undefined;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(gameId: string, dto: UpdateGameDto, userId: string, roles: string[]): UpdateGameCommand {
    return new UpdateGameCommand(
      gameId,
      dto.name,
      dto.options,
      dto.powerLevel,
      dto.shortDescription,
      dto.description,
      userId,
      roles,
    );
  }
}
