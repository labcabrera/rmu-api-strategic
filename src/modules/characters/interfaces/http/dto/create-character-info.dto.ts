import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { CreateCharacterInfo } from 'src/modules/characters/application/cqrs/commands/create-character.command';
import type { CharacterRealm } from 'src/modules/characters/domain/value-objects/character-realm.vo';

export class CreateCharacterInfoDto {
  @ApiProperty({ description: 'Race identifier' })
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
  realmType: CharacterRealm;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  static toCommand(dto: CreateCharacterInfoDto): CreateCharacterInfo {
    return new CreateCharacterInfo(dto.raceId, dto.professionId, dto.sizeId, dto.realmType, dto.height, dto.weight);
  }
}
