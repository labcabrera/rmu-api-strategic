import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { CharacterInfo } from '../../persistence/models/character-childs.model';
import * as ce from 'src/modules/characters/domain/entities/character.entity';

export class CharacterInfoDto {
  @ApiProperty({ description: 'Race identifier', example: 'ork' })
  @IsString()
  @IsNotEmpty()
  raceId: string;

  @ApiProperty({ description: 'Profession identifier', example: 'rogue' })
  @IsString()
  @IsNotEmpty()
  professionId: string;

  @ApiProperty({ description: 'Character backstory', example: 'A brave warrior from Gondor.' })
  @IsString()
  @IsNotEmpty()
  sizeId: string;

  @ApiProperty({ description: 'Character realm type', example: 'channeling' })
  @IsString()
  @IsNotEmpty()
  realmType: ce.CharacterRealm;

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
    dto.raceId = entity.raceId;
    dto.professionId = entity.professionId;
    dto.sizeId = entity.sizeId;
    dto.height = entity.height;
    dto.weight = entity.weight;
    return dto;
  }
}
