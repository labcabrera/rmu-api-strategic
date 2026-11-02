import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import type { CharacterSpellcasting } from '../../../application/cqrs/handlers/get-character-spellcasting.handler.js';
import type { KnownSpell, KnownSpellList } from '../../../application/services/known-spells.reader.js';
import { CharacterPowerDto } from './character-power.dto.js';

export class PowerAmountDto {
  @ApiProperty({ description: 'Power points', example: 5 })
  @IsInt()
  @Min(1)
  amount: number;
}

export class KnownSpellDto {
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'The spell as rmu-api-spells returns it' })
  spell: Record<string, unknown>;

  @ApiProperty({ description: 'Power points to cast it', example: 3 })
  powerPoints: number;

  static fromEntity(entity: KnownSpell): KnownSpellDto {
    const dto = new KnownSpellDto();
    dto.spell = entity.spell;
    dto.powerPoints = entity.powerPoints;
    return dto;
  }
}

export class KnownSpellListDto {
  @ApiProperty({ description: 'Spell list skill', example: 'base-spell-list' })
  skillId: string;

  @ApiProperty({ description: 'Code of the list (the skill specialization)', example: 'fire-law' })
  code: string;

  @ApiProperty({ type: String, nullable: true, description: 'Id of the list in rmu-api-spells: null when it does not exist' })
  spellListId: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Fire Law' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'base' })
  type: string | null;

  @ApiProperty({ type: [String], example: ['essence'] })
  realms: string[];

  @ApiProperty({ description: 'Ranks in the list: the highest spell level known', example: 5 })
  ranks: number;

  @ApiProperty({ description: 'List type modifier of the Spellcasting Roll', example: 5 })
  listTypeModifier: number;

  @ApiProperty({ type: [KnownSpellDto] })
  spells: KnownSpellDto[];

  static fromEntity(entity: KnownSpellList): KnownSpellListDto {
    const dto = new KnownSpellListDto();
    dto.skillId = entity.skillId;
    dto.code = entity.code;
    dto.spellListId = entity.spellListId;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.realms = entity.realms;
    dto.ranks = entity.ranks;
    dto.listTypeModifier = entity.listTypeModifier;
    dto.spells = entity.spells.map(spell => KnownSpellDto.fromEntity(spell));
    return dto;
  }
}

export class CharacterSpellcastingDto {
  @ApiProperty({ example: '6a1f0c2e-0000-4000-8000-000000000000' })
  characterId: string;

  @ApiProperty({ type: [String], example: ['essence'] })
  realms: string[];

  @ApiProperty({ description: 'Realm stat bonus (the lowest one for a hybrid)', example: 8 })
  realmStatBonus: number;

  @ApiProperty({ description: 'Caster level', example: 3 })
  level: number;

  @ApiProperty({ type: CharacterPowerDto, nullable: true })
  power: CharacterPowerDto | null;

  @ApiProperty({ type: [KnownSpellListDto] })
  lists: KnownSpellListDto[];

  static fromEntity(entity: CharacterSpellcasting): CharacterSpellcastingDto {
    const dto = new CharacterSpellcastingDto();
    dto.characterId = entity.characterId;
    dto.realms = entity.realms;
    dto.realmStatBonus = entity.realmStatBonus;
    dto.level = entity.level;
    dto.power = entity.power ? CharacterPowerDto.fromEntity(entity.power) : null;
    dto.lists = entity.lists.map(list => KnownSpellListDto.fromEntity(list));
    return dto;
  }
}
