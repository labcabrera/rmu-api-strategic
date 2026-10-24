import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested, IsInt, Min } from 'class-validator';
import { UpdateGameCommand } from '../../../application/cqrs/commands/update-game.command.js';
import { GameOptionsDto } from './game-options.dto.js';
import { GamePowerLevelDto } from './game-power-level.dto.js';

export class UpdateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Game options', type: GameOptionsDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GameOptionsDto)
  options?: GameOptionsDto;

  @ApiProperty({ description: 'Game power level', type: GamePowerLevelDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GamePowerLevelDto)
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

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

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
      dto.version,
    );
  }
}
