import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CharacterMovementCreationDto } from './character-movement-dto';
import { CharacterSkillCreationDto } from './character-skill.dto';
import { CharacterStatCreationDto } from './character-stat.dto';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto';
import { CreateCharacterCommand, CharacterStatCreation } from 'src/modules/characters/application/cqrs/commands/create-character.command';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';
import { CreateCharacterInfoDto } from './create-character-info.dto';
import { StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';

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

  @ApiProperty({ description: 'Character movement', type: CharacterMovementCreationDto })
  @ValidateNested()
  @Type(() => CharacterMovementCreationDto)
  @IsObject()
  movement: CharacterMovementCreationDto;

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

  static toCommand(dto: CreateCharacterDto, userId: string, roles: string[]): CreateCharacterCommand {
    const skills = dto.skills!.map((skill) => ({
      skillId: skill.skillId,
      ranks: skill.ranks,
      specialization: skill.specialization,
    }));
    const statistics: Record<StatKey, CharacterStatCreation> = Object.fromEntries(
      Object.entries(dto.statistics || {}).map(([k, v]) => [
        k as StatKey,
        new CharacterStatCreation((v as any).potential, (v as any).temporary),
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
    );
  }
}
