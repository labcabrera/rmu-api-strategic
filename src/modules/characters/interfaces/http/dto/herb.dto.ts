import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BIOMES, type Biome } from '../../../../items/domain/value-objects/item-catalog-info.vo.js';
import { ItemDto } from '../../../../items/interfaces/http/dto/item.dto.js';
import {
  HERB_SEARCH_SKILLS,
  type HerbSearchSkill,
  SearchHerbsCommand,
  UseHerbCommand,
} from '../../../application/cqrs/commands/herb.commands.js';
import {
  type HerbSearchHerbResult,
  type HerbSearchOutcome,
  MAX_HERBS_PER_SEARCH,
  type UseHerbResult,
} from '../../../application/cqrs/handlers/herb.handlers.js';
import { CharacterHPDto } from './character-hp.dto.js';

export class UseHerbDto {
  @ApiProperty({ description: 'Herb item of the character with a heal effect' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  itemId: string;

  @ApiPropertyOptional({ description: 'Hits healed by the dose; rolled in the range of the herb when missing', example: 7 })
  @IsInt()
  @Min(0)
  @IsOptional()
  roll?: number;

  static toCommand(characterId: string, dto: UseHerbDto, userId: string, roles: string[]): UseHerbCommand {
    return new UseHerbCommand(characterId, dto.itemId, dto.roll, userId, roles);
  }
}

export class UseHerbResultDto {
  @ApiProperty({ description: 'Hits healed (the maximum hits cap the roll)', example: 5 })
  healed: number;

  @ApiProperty({ description: 'Hits of the dose: the one sent or rolled', example: 7 })
  roll: number;

  @ApiProperty({ type: CharacterHPDto })
  hp: CharacterHPDto;

  @ApiProperty({ type: ItemDto, nullable: true, description: 'The herb after the dose; null when it was the last one' })
  item: ItemDto | null;

  static from(result: UseHerbResult): UseHerbResultDto {
    return Object.assign(new UseHerbResultDto(), {
      healed: result.healed,
      roll: result.roll,
      hp: CharacterHPDto.fromEntity(result.hp),
      item: result.item ? ItemDto.fromEntity(result.item) : null,
    });
  }
}

export class HerbSearchModifierDto {
  @ApiProperty({ example: 'herbalism' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  value: number;
}

export class SearchHerbsDto {
  @ApiProperty({ enum: BIOMES, description: 'Biome code of Treasure Law table 2-3b', example: 'F' })
  @IsIn(BIOMES)
  biome: Biome;

  @ApiPropertyOptional({ description: 'High altitude (the /A of the herbs)', default: false })
  @IsBoolean()
  @IsOptional()
  highAltitude?: boolean;

  @ApiProperty({ type: [String], description: `Herb item types of the catalog, 1 to ${MAX_HERBS_PER_SEARCH}, in order` })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_HERBS_PER_SEARCH)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  herbItemTypeIds: string[];

  @ApiProperty({ enum: HERB_SEARCH_SKILLS, example: 'survival' })
  @IsIn(HERB_SEARCH_SKILLS)
  skillId: HerbSearchSkill;

  @ApiPropertyOptional({ description: 'Specialization of the skill (the biome of Survival)', example: 'forest' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  specialization?: string;

  @ApiProperty({ description: 'Open-ended roll', example: 87 })
  @IsInt()
  roll: number;

  @ApiPropertyOptional({ description: 'Unmodified roll (66 is an unusual event)', example: 87 })
  @IsInt()
  @IsOptional()
  unmodifiedRoll?: number;

  @ApiPropertyOptional({ description: 'Skill bonus typed by hand; by default the one of the sheet' })
  @IsInt()
  @IsOptional()
  bonus?: number;

  @ApiPropertyOptional({ type: [HerbSearchModifierDto], description: 'Complementary skills (Herbalism, Region Lore) and others' })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HerbSearchModifierDto)
  @IsOptional()
  modifiers?: HerbSearchModifierDto[];

  @ApiPropertyOptional({ description: 'Searches already made in the same area: -10 each', default: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  previousSearches?: number;

  @ApiPropertyOptional({ description: 'A familiar area: half the time', default: false })
  @IsBoolean()
  @IsOptional()
  familiar?: boolean;

  static toCommand(characterId: string, dto: SearchHerbsDto, userId: string, roles: string[]): SearchHerbsCommand {
    return new SearchHerbsCommand(
      characterId,
      {
        biome: dto.biome,
        highAltitude: dto.highAltitude ?? false,
        herbItemTypeIds: [...dto.herbItemTypeIds],
        skillId: dto.skillId,
        ...(dto.specialization ? { specialization: dto.specialization } : {}),
        roll: dto.roll,
        ...(dto.unmodifiedRoll !== undefined ? { unmodifiedRoll: dto.unmodifiedRoll } : {}),
        ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
        modifiers: (dto.modifiers ?? []).map(modifier => ({ key: modifier.key, value: modifier.value })),
        previousSearches: dto.previousSearches ?? 0,
        familiar: dto.familiar ?? false,
      },
      userId,
      roles,
    );
  }
}

export class HerbSearchHerbDto {
  @ApiProperty()
  itemTypeId: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ nullable: true, description: 'Find code of the herb', example: 'h' })
  difficulty: string | null;
  @ApiProperty({ type: [HerbSearchModifierDto], description: 'Difficulty, previous searches and several herbs' })
  modifiers: { key: string; value: number }[];
  @ApiProperty({ description: 'Total of the maneuver (0 when the herb is not here)' })
  total: number;
  @ApiPropertyOptional({ description: 'Result of the absolute maneuver of core' })
  maneuverResult?: string;
  @ApiProperty({ enum: ['found', 'not-found', 'absolute-failure', 'not-here'] })
  result: HerbSearchHerbResult['result'];
  @ApiPropertyOptional({ description: 'd10 of the doses, when found' })
  d10?: number;
  @ApiProperty({ description: '1d10 + 1 per full 10 over 100 when found, else 0' })
  doses: number;
  @ApiProperty({ type: [String], description: 'Items of the character the doses went to' })
  itemIds: string[];
}

export class HerbSearchResultDto {
  @ApiProperty({ enum: BIOMES })
  biome: string;
  @ApiProperty()
  highAltitude: boolean;
  @ApiProperty({ enum: HERB_SEARCH_SKILLS })
  skillId: string;
  @ApiProperty()
  roll: number;
  @ApiProperty({ description: 'Skill bonus used' })
  bonus: number;
  @ApiProperty({ type: [HerbSearchModifierDto] })
  modifiers: { key: string; value: number }[];
  @ApiProperty({ description: 'Roll + bonus + modifiers, before the modifiers of each herb' })
  base: number;
  @ApiProperty({ description: 'Hours of the search (half in a familiar area); the campaign clock does not advance', example: 10 })
  hours: number;
  @ApiPropertyOptional()
  unusualEvent?: boolean;
  @ApiProperty({ type: [HerbSearchHerbDto] })
  herbs: HerbSearchHerbDto[];
  @ApiProperty({ type: [ItemDto], description: 'Items with the doses found' })
  items: ItemDto[];

  static from(outcome: HerbSearchOutcome): HerbSearchResultDto {
    return Object.assign(new HerbSearchResultDto(), {
      ...outcome,
      herbs: outcome.herbs.map(herb => ({ ...herb })),
      items: outcome.items.map(item => ItemDto.fromEntity(item)),
    });
  }
}
