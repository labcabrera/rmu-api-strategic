import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CharacterSkillCreationDto } from './character-skill.dto.js';
import { CharacterStatCreationDto } from './character-stat.dto.js';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto.js';
import { CreateCharacterCommand, CharacterStatCreation } from '../../../application/cqrs/commands/create-character.command.js';
import type { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo.js';
import { CreateCharacterInfoDto } from './create-character-info.dto.js';
import type { StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import { CreateCharacterCultureDto } from './create-character-culture.dto.js';

export class CreateCharacterDto {
  @ApiProperty({ description: 'Character name', example: 'Sauron' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game identifier', example: 'game-01' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Faction identifier', example: 'faction-01' })
  @IsString()
  @IsNotEmpty()
  factionId: string;

  @ApiProperty({ description: 'Character information', type: CreateCharacterInfoDto })
  @ValidateNested()
  @Type(() => CreateCharacterInfoDto)
  @IsObject()
  info: CreateCharacterInfoDto;

  @ApiProperty({ description: 'Character movement' })
  // @ValidateNested()
  @IsObject()
  statistics: Record<StatKey, CharacterStatCreationDto>;

  @ApiProperty({ description: 'Character level', example: 1 })
  @IsNumber()
  level: number;

  @ApiProperty({ description: 'Character weapon development', type: [String] })
  @IsArray()
  weaponDevelopment: WeaponDevelopmentType[] = [];

  @ApiProperty({ description: 'Character skills', type: [CharacterSkillCreationDto] })
  @ValidateNested({ each: true })
  @Type(() => CharacterSkillCreationDto)
  @IsArray()
  skills: CharacterSkillCreationDto[] | undefined;

  @ApiProperty({ description: 'Character roleplay info', type: CharacterRoleplayInfoDto })
  @ValidateNested()
  @Type(() => CharacterRoleplayInfoDto)
  @IsObject()
  roleplay: CharacterRoleplayInfoDto;

  @ApiProperty({ description: 'Character image URL', example: 'https://example.com/images/character.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Optional culture: its ranks are applied before level 1 without spending development points',
    type: CreateCharacterCultureDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCharacterCultureDto)
  culture?: CreateCharacterCultureDto;

  static toCommand(dto: CreateCharacterDto, userId: string, roles: string[]): CreateCharacterCommand {
    const skills = dto.skills!.map(skill => ({
      skillId: skill.skillId,
      ranks: skill.ranks,
      specialization: skill.specialization,
    }));
    const statistics: Record<StatKey, CharacterStatCreation> = Object.fromEntries(
      Object.entries(dto.statistics || {}).map(([k, v]) => [
        k as StatKey,
        new CharacterStatCreation((v as { potential: number }).potential, (v as { temporary: number }).temporary),
      ]),
    ) as Record<StatKey, CharacterStatCreation>;

    return new CreateCharacterCommand(
      dto.gameId,
      dto.factionId,
      dto.name,
      CreateCharacterInfoDto.toCommand(dto.info),
      dto.roleplay,
      dto.level,
      dto.weaponDevelopment,
      statistics,
      skills,
      dto.imageUrl,
      userId,
      roles,
      CreateCharacterCultureDto.toCommand(dto.culture),
    );
  }
}
