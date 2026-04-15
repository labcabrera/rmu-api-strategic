import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateGameCommand } from 'src/modules/games/application/cqrs/commands/create-game.command';
import { GameOptionsDto } from './game-options.dto';
import { GamePowerLevelDto } from './game-power-level-dto';

export class CreateGameDto {
  @ApiProperty({ description: 'Game name', example: 'Mordor Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Realm identifier from core module', example: 'lotr' })
  @IsString()
  @IsNotEmpty()
  realmId: string;

  @ApiProperty({ description: 'Game options', type: GameOptionsDto })
  @IsNotEmpty()
  @ValidateNested()
  options: GameOptionsDto;

  @ApiProperty({ description: 'Game power level', type: GamePowerLevelDto })
  @IsNotEmpty()
  powerLevel: GamePowerLevelDto;

  @ApiProperty({ description: 'Game short description', example: 'Short game description' })
  @IsString()
  @IsOptional()
  shortDescription: string | null;

  @ApiProperty({
    description: 'Game description',
    example: 'A thrilling campaign set in Middle-earth with largue text',
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    description: 'Game description',
    example: 'A thrilling campaign set in Middle-earth with largue text',
  })
  @IsString()
  @IsOptional()
  imageUrl: string | null;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]): CreateGameCommand {
    return new CreateGameCommand(
      dto.name,
      dto.realmId,
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
