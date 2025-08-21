import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { UpdateCharacterCommand } from '../../../application/commands/update-character.command';
import { CharacterHP } from '../../persistence/models/character.model-childs';
import { CharacterDefenseDto } from './character-defense.dto';
import { CharacterEnduranceDto } from './character-endurance.dto';
import { CharacterEquipmentDto } from './character-equipment.dto';
import { CharacterHPDto } from './character-hp.dto';
import { CharacterInitiativeDto } from './character-initiative.dto';
import { CharacterItemDto } from './character-item.dto';
import { CharacterMovementDto } from './character-movement-dto';
import { CharacterSkillDto } from './character-skill.dto';
import { CharacterStatisticsDto } from './character-statistics.dto';
import { CharacterXPDto } from './character-xp.dto';
import * as characterEntity from 'src/modules/characters/domain/entities/character.entity';
import { CharacterInfoDto } from './character-info.dto';
import { CharacterAttackDto } from './character-attack.dto';

export class CharacterDto {
  @ApiProperty({ description: 'Character identifier', example: 'character-001' })
  id: string;

  @ApiProperty({ description: 'Strategic game identifier', example: 'game-001' })
  gameId: string;

  @ApiProperty({ description: 'Faction identifier of the character', example: 'faction-mordor' })
  factionId: string;

  @ApiProperty({ description: 'Name of the character', example: 'Sauron' })
  name: string;

  @ApiProperty({ description: 'General information about the character', type: CharacterInfoDto })
  info: CharacterInfoDto;

  @ApiProperty({ description: 'Level and experience points of the character', type: CharacterXPDto })
  experience: CharacterXPDto;

  @ApiProperty({ description: 'Character statistics', type: CharacterStatisticsDto })
  statistics: CharacterStatisticsDto;

  @ApiProperty({ description: 'Character movement', type: CharacterMovementDto })
  movement: CharacterMovementDto;

  @ApiProperty({ description: 'Character defense', type: CharacterDefenseDto })
  defense: CharacterDefenseDto;

  @ApiProperty({ description: 'Character endurance', type: CharacterEnduranceDto })
  endurance: CharacterEnduranceDto;

  @ApiProperty({ description: 'Character health points', type: CharacterHPDto })
  hp: CharacterHPDto;

  @ApiProperty({ description: 'Character initiative', type: CharacterInitiativeDto })
  initiative: CharacterInitiativeDto;

  @ApiProperty({ description: 'Character skills', type: [CharacterSkillDto] })
  skills: CharacterSkillDto[];

  @ApiProperty({ description: 'Character items', type: [CharacterItemDto] })
  items: CharacterItemDto[];

  @ApiProperty({ description: 'Character equipment', type: CharacterEquipmentDto })
  equipment: CharacterEquipmentDto;

  @ApiProperty({ description: 'Character attacks', type: [CharacterAttackDto] })
  attacks: CharacterAttackDto[];

  @ApiProperty({ description: 'Character owner', example: 'user-001' })
  owner: string;

  static fromEntity(entity: characterEntity.Character) {
    const dto = new CharacterDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.factionId = entity.factionId;
    dto.name = entity.name;
    dto.info = entity.info;
    dto.experience = CharacterXPDto.fromEntity(entity.experience);
    dto.statistics = CharacterStatisticsDto.fromEntity(entity.statistics);
    dto.movement = CharacterMovementDto.fromEntity(entity.movement);
    dto.defense = CharacterDefenseDto.fromEntity(entity.defense);
    dto.endurance = CharacterEnduranceDto.fromEntity(entity.endurance);
    dto.hp = CharacterHPDto.fromEntity(entity.hp);
    dto.initiative = CharacterInitiativeDto.fromEntity(entity.initiative);
    dto.skills = entity.skills.map((skill) => CharacterSkillDto.fromEntity(skill));
    dto.items = entity.items.map((item) => CharacterItemDto.fromEntity(item));
    dto.equipment = CharacterEquipmentDto.fromEntity(entity.equipment);
    dto.attacks = entity.attacks.map((attack) => CharacterAttackDto.fromEntity(attack));
    dto.owner = entity.owner;
    return dto;
  }
}

export class UpdateCharacterDto {
  characterId: string;
  name: string | undefined;
  faction: string | undefined;
  info: Partial<characterEntity.CharacterInfo> | undefined;
  hp: Partial<CharacterHP> | undefined;
  static toCommand(id: string, dto: UpdateCharacterDto, userId: string, roles: string[]): UpdateCharacterCommand {
    return new UpdateCharacterCommand(dto.characterId, dto.name, dto.faction, dto.info, dto.hp, userId, roles);
  }
}

export class CharacterPageDto {
  @ApiProperty({ type: [CharacterDto], description: 'Characters', isArray: true })
  content: CharacterDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
