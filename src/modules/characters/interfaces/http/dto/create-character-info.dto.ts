import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateCharacterInfo } from '../../../application/cqrs/commands/create-character.command.js';
import { CHARACTER_REALMS, type CharacterRealm } from '../../../domain/value-objects/character-realm.vo.js';

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

  @ApiPropertyOptional({
    type: [String],
    enum: CHARACTER_REALMS,
    description: 'Realms: the fixed ones of a spellcaster profession (two for a hybrid) or one for an arms profession',
    example: ['essence'],
  })
  @IsArray()
  @ArrayMaxSize(2)
  @IsIn(CHARACTER_REALMS, { each: true })
  @IsOptional()
  realmTypes?: CharacterRealm[];

  @ApiPropertyOptional({ type: String, enum: CHARACTER_REALMS, description: 'Deprecated: one realm, use realmTypes', deprecated: true })
  @IsIn(CHARACTER_REALMS)
  @IsOptional()
  realmType?: CharacterRealm;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  static toCommand(dto: CreateCharacterInfoDto): CreateCharacterInfo {
    const realmTypes = dto.realmTypes ?? (dto.realmType ? [dto.realmType] : []);
    return new CreateCharacterInfo(dto.raceId, dto.professionId, dto.sizeId, realmTypes, dto.height, dto.weight);
  }
}
