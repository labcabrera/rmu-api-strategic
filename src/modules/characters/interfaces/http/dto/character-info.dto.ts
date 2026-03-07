import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { CharacterInfo } from 'src/modules/characters/domain/value-objects/character-info.vo';
import type { CharacterRealm } from 'src/modules/characters/domain/value-objects/character-realm.vo';
import { NamedIdDto } from 'src/modules/shared/infrastructure/controller/dto';
import { Type } from 'class-transformer';

export class CharacterInfoDto {
  @ApiProperty({ description: 'Race identifier', type: NamedIdDto })
  @ValidateNested()
  @Type(() => NamedIdDto)
  @IsNotEmpty()
  race: NamedIdDto;

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

  static fromEntity(entity: CharacterInfo): CharacterInfoDto {
    const dto = new CharacterInfoDto();
    dto.race = { id: entity.race.id, name: entity.race.name };
    dto.professionId = entity.professionId;
    dto.sizeId = entity.sizeId;
    dto.realmType = entity.realmType;
    dto.height = entity.height;
    dto.weight = entity.weight;
    return dto;
  }
}
