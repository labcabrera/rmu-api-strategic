import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CharacterEnduranceCreationDto } from './character-endurance.dto';
import { CharacterInitiativeCreationDto } from './character-initiative.dto';
import { CharacterMovementCreationDto } from './character-movement-dto';
import { CharacterSkillCreationDto } from './character-skill.dto';
import { CharacterStatisticsCreationDto } from './character-statistics.dto';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto';
import { CreateCharacterCommand } from 'src/modules/characters/application/cqrs/commands/create-character.command';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';
import { CreateCharacterInfoDto } from './create-character-info.dto';

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

  @ApiProperty({ description: 'Character roleplay info', type: CharacterRoleplayInfoDto })
  @ValidateNested()
  @Type(() => CharacterRoleplayInfoDto)
  @IsObject()
  roleplay: CharacterRoleplayInfoDto;

  @ApiProperty({ description: 'Character level', example: 1 })
  @IsNumber()
  level: number;

  @ApiProperty({ description: 'Character weapon development', type: [String] })
  @IsArray()
  weaponDevelopment: WeaponDevelopmentType[] = [];

  @ApiProperty({ description: 'Character movement', type: CharacterStatisticsCreationDto })
  @ValidateNested()
  @Type(() => CharacterStatisticsCreationDto)
  @IsObject()
  statistics: CharacterStatisticsCreationDto;

  @ApiProperty({ description: 'Character movement', type: CharacterMovementCreationDto })
  @ValidateNested()
  @Type(() => CharacterMovementCreationDto)
  @IsObject()
  movement: CharacterMovementCreationDto;

  @ApiProperty({ description: 'Character endurance', type: CharacterEnduranceCreationDto })
  @ValidateNested()
  @Type(() => CharacterEnduranceCreationDto)
  @IsObject()
  endurance: CharacterEnduranceCreationDto;

  @ApiProperty({ description: 'Character initiative', type: CharacterInitiativeCreationDto })
  @ValidateNested()
  @Type(() => CharacterInitiativeCreationDto)
  @IsObject()
  initiative: CharacterInitiativeCreationDto;

  @ApiProperty({ description: 'Character skills', type: [CharacterSkillCreationDto] })
  @ValidateNested({ each: true })
  @Type(() => CharacterSkillCreationDto)
  @IsArray()
  skills: CharacterSkillCreationDto[] | undefined;

  @ApiProperty({ description: 'Character image URL', example: 'https://example.com/images/character.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  static toCommand(dto: CreateCharacterDto, userId: string, roles: string[]): CreateCharacterCommand {
    const skills = dto.skills!.map((skill) => ({
      skillId: skill.skillId,
      ranks: skill.ranks,
      customBonus: skill.customBonus,
      specialization: skill.specialization,
    }));
    return new CreateCharacterCommand(
      dto.gameId,
      dto.factionId,
      dto.name,
      CreateCharacterInfoDto.toCommand(dto.info),
      dto.roleplay,
      dto.level,
      dto.weaponDevelopment,
      dto.statistics.toEntity(),
      dto.movement.strideCustomBonus,
      dto.endurance.customBonus,
      dto.initiative.customBonus,
      skills,
      dto.imageUrl,
      userId,
      roles,
    );
  }
}
