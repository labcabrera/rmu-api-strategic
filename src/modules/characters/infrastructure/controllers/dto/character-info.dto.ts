import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { CharacterInfo } from '../../persistence/models/character.model-childs';

export class CharacterInfoDto {
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

  static fromEntity(entity: CharacterInfo): CharacterInfoDto {
    const dto = new CharacterInfoDto();
    dto.race = entity.race;
    dto.professionId = entity.professionId;
    dto.sizeId = entity.sizeId;
    dto.height = entity.height;
    dto.weight = entity.weight;
    return dto;
  }
}
