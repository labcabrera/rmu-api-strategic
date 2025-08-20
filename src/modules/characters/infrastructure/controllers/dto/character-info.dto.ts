import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CharacterInfoDto {
  @ApiProperty({ description: 'Character level', example: 4 })
  @IsNumber()
  @IsNotEmpty()
  level: number;

  @ApiProperty({ description: 'Race identifier', example: 'ork' })
  @IsString()
  @IsNotEmpty()
  race: string;

  @ApiProperty({ description: 'Profession identifier', example: 'rogue' })
  @IsString()
  @IsNotEmpty()
  professionId: string;

  @ApiProperty({ description: 'Character backstory', example: 'A brave warrior from Gondor.' })
  @IsString()
  @IsNotEmpty()
  sizeId: string;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;
}
