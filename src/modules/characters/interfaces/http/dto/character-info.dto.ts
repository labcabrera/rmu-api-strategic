import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { CharacterInfo } from 'src/modules/characters/domain/value-objects/character-info.vo';
import type { CharacterRealm } from 'src/modules/characters/domain/value-objects/character-realm.vo';
import { Type } from 'class-transformer';
import { NamedEntityDto } from 'src/modules/shared/interfaces/http/dto/named-entity.dto';

export class CharacterInfoDto {
  @ApiProperty({ description: 'Race identifier', type: NamedEntityDto })
  @ValidateNested()
  @Type(() => NamedEntityDto)
  @IsNotEmpty()
  race: NamedEntityDto;

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

  @ApiProperty({ description: 'Culture identifier chosen at creation', required: false, example: 'urban' })
  cultureId: string | null;

  @ApiProperty({ description: 'Race recovery multiplier of the injury recovery time', required: false, example: 1 })
  recoveryMultiplier: number;

  static fromEntity(entity: CharacterInfo): CharacterInfoDto {
    const dto = new CharacterInfoDto();
    dto.race = { id: entity.race.id, name: entity.race.name };
    dto.professionId = entity.professionId;
    dto.sizeId = entity.sizeId;
    dto.realmType = entity.realmType;
    dto.height = entity.height;
    dto.weight = entity.weight;
    dto.cultureId = entity.cultureId ?? null;
    dto.recoveryMultiplier = entity.recoveryMultiplier ?? 1;
    return dto;
  }
}
