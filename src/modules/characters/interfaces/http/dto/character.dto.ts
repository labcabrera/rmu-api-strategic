import { ApiProperty } from '@nestjs/swagger';
import { CharacterDefenseDto } from './character-defense.dto';
import { CharacterEnduranceDto } from './character-endurance.dto';
import { CharacterEquipmentDto } from './character-equipment.dto';
import { CharacterHPDto } from './character-hp.dto';
import { CharacterInitiativeDto } from './character-initiative.dto';
import { CharacterMovementDto } from './character-movement-dto';
import { CharacterSkillDto } from './character-skill.dto';
import { CharacterStatDto } from './character-stat.dto';
import { CharacterXPDto } from './character-xp.dto';
import { CharacterInfoDto } from './character-info.dto';
import { CharacterAttackDto } from './character-attack.dto';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto';
import { CharacterResistanceDto } from './character-resistance.dto';
import { CharacterTraitDto } from './character-trait.dto';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';
import { NamedEntityDto } from 'src/modules/shared/interfaces/http/dto/named-entity.dto';
import { PaginationDto } from 'src/modules/shared/interfaces/http/dto/page.dto';
import { STAT_KEYS, StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';

export class CharacterDto {
  @ApiProperty({ description: 'Character identifier', example: 'character-001' })
  id: string;

  @ApiProperty({ description: 'Strategic game identifier', example: 'game-001' })
  gameId: string;

  @ApiProperty({ description: 'Faction of the character', type: NamedEntityDto })
  faction: NamedEntityDto;

  @ApiProperty({ description: 'Name of the character', example: 'Sauron' })
  name: string;

  @ApiProperty({ description: 'General information about the character', type: CharacterInfoDto })
  info: CharacterInfoDto;

  @ApiProperty({ description: 'Roleplay information of the character', type: CharacterRoleplayInfoDto })
  roleplay: CharacterRoleplayInfoDto;

  @ApiProperty({ description: 'Level and experience points of the character', type: CharacterXPDto })
  experience: CharacterXPDto;

  @ApiProperty({ description: 'Character statistics', type: Object })
  statistics: Record<StatKey, CharacterStatDto>;

  @ApiProperty({ description: 'Character movement', type: CharacterMovementDto })
  movement: CharacterMovementDto;

  @ApiProperty({ description: 'Character defense', type: CharacterDefenseDto })
  defense: CharacterDefenseDto;

  @ApiProperty({ description: 'Character resistances', type: [CharacterResistanceDto] })
  resistances: CharacterResistanceDto[];

  @ApiProperty({ description: 'Character endurance', type: CharacterEnduranceDto })
  endurance: CharacterEnduranceDto;

  @ApiProperty({ description: 'Character health points', type: CharacterHPDto })
  hp: CharacterHPDto;

  @ApiProperty({ description: 'Character initiative', type: CharacterInitiativeDto })
  initiative: CharacterInitiativeDto;

  @ApiProperty({ description: 'Character skills', type: [CharacterSkillDto] })
  skills: CharacterSkillDto[];

  @ApiProperty({ description: 'Character equipment', type: CharacterEquipmentDto })
  equipment: CharacterEquipmentDto;

  @ApiProperty({ description: 'Character attacks', type: [CharacterAttackDto] })
  attacks: CharacterAttackDto[];

  @ApiProperty({ description: 'Character talents and flaws', type: [CharacterTraitDto] })
  traits: CharacterTraitDto[];

  @ApiProperty({ description: 'Character description', example: 'The Dark Lord of Mordor' })
  description: string | undefined;

  @ApiProperty({ description: 'Character image URL', example: 'images/foo/bar.png', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Character owner', example: 'user-001' })
  owner: string;

  static fromEntity(entity: Character) {
    const statistics: Record<StatKey, CharacterStatDto> = {} as Record<StatKey, CharacterStatDto>;
    for (const key of STAT_KEYS) {
      statistics[key] = CharacterStatDto.fromEntity(entity.statistics[key]);
    }
    const dto = new CharacterDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.faction = { id: entity.faction.id, name: entity.faction.name };
    dto.name = entity.name;
    dto.info = CharacterInfoDto.fromEntity(entity.info);
    dto.roleplay = CharacterRoleplayInfoDto.fromEntity(entity.roleplay);
    dto.experience = CharacterXPDto.fromEntity(entity.experience);
    dto.statistics = statistics;
    dto.movement = CharacterMovementDto.fromEntity(entity.movement);
    dto.defense = CharacterDefenseDto.fromEntity(entity.defense);
    dto.resistances = entity.resistances.map(resistance => CharacterResistanceDto.fromEntity(resistance));
    dto.endurance = CharacterEnduranceDto.fromEntity(entity.endurance);
    dto.hp = CharacterHPDto.fromEntity(entity.hp);
    dto.initiative = CharacterInitiativeDto.fromEntity(entity.initiative);
    dto.skills = entity.skills.map(skill => CharacterSkillDto.fromEntity(skill));
    dto.equipment = CharacterEquipmentDto.fromEntity(entity.equipment);
    dto.attacks = entity.attacks.map(attack => CharacterAttackDto.fromEntity(attack));
    dto.traits = entity.traits.map(trait => CharacterTraitDto.fromEntity(trait));
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    return dto;
  }
}

export class CharacterPageDto {
  @ApiProperty({ type: [CharacterDto], description: 'Characters', isArray: true })
  content: CharacterDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
