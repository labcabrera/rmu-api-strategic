import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import type { CharacterRealm } from 'src/modules/characters/domain/value-objects/character-realm.vo';
import { NamedIdDto } from 'src/modules/shared/infrastructure/controller/dto';

export class CreateCharacterInfoDto {
  @ApiProperty({ description: 'Race identifier' })
  @IsString()
  @IsNotEmpty()
  raceId: NamedIdDto;

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
  realmType: CharacterRealm;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;
}
