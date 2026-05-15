import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateGameCommand } from 'src/modules/games/application/cqrs/commands/update-game.command';
import { GameOptionsDto } from './game-options.dto';
import { GamePowerLevelDto } from './game-power-level-dto';

export class UpdateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Game options', type: GameOptionsDto, required: false })
  @IsOptional()
  @IsObject()
  options?: GameOptionsDto;

  @ApiProperty({ description: 'Game power level', type: GamePowerLevelDto, required: false })
  @IsOptional()
  @IsObject()
  powerLevel?: GamePowerLevelDto;

  @ApiProperty({ description: 'Game short description', example: 'Game short description', required: false })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ description: 'Game description', example: 'A thrilling campaign set in Middle-earth', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Game image URL', example: '/foo/bar/image.png', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  static toCommand(gameId: string, dto: UpdateGameDto, userId: string, roles: string[]): UpdateGameCommand {
    return new UpdateGameCommand(
      gameId,
      dto.name,
      dto.options,
      dto.powerLevel,
      dto.shortDescription,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
    );
  }
}
