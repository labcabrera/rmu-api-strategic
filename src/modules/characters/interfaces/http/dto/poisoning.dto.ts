import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GiveAntidoteCommand, PoisonCharacterCommand } from '../../../application/cqrs/commands/poisoning.commands.js';
import type { GiveAntidoteResult, PoisonCharacterResult } from '../../../application/cqrs/handlers/poisoning.handlers.js';
import type { PoisonRrModifier } from '../../../domain/services/healing/poison-rr.js';
import {
  ANTIDOTE_SOURCES,
  ANY_POISON,
  type AntidoteSource,
  POISON_CATEGORIES,
  POISON_FORMS,
  POISON_SEVERITIES,
  type PoisonCategory,
  type PoisonData,
  type PoisonForm,
  type PoisonSeverity,
} from '../../../domain/value-objects/poison.vo.js';
import { CharacterDto } from './character.dto.js';

export class PoisonRangeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  min: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  max: number;
}

export class PoisonDataDto implements PoisonData {
  @ApiPropertyOptional({ description: 'Catalog item of the poison' })
  @IsOptional()
  @IsString()
  itemTypeId?: string;

  @ApiProperty({ example: 'Sleeping draught' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ type: String, enum: POISON_CATEGORIES })
  @IsIn(POISON_CATEGORIES)
  category: PoisonCategory;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  level: number;

  @ApiPropertyOptional({ type: String, enum: POISON_FORMS })
  @IsOptional()
  @IsIn(POISON_FORMS)
  form?: PoisonForm;

  @ApiPropertyOptional({ type: String, enum: POISON_SEVERITIES, nullable: true })
  @IsOptional()
  @IsIn(POISON_SEVERITIES)
  maxSeverity?: PoisonSeverity | null;

  @ApiPropertyOptional({ type: PoisonRangeDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoisonRangeDto)
  immediateHits?: PoisonRangeDto | null;

  @ApiPropertyOptional({ type: PoisonRangeDto, nullable: true, description: 'Onset of the mild stage, in rounds' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoisonRangeDto)
  onsetRounds?: PoisonRangeDto | null;
}

export class PoisonRrModifierDto implements PoisonRrModifier {
  @ApiProperty({ example: 'half-dose' })
  @IsString()
  key: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  value: number;
}

/** `POST /v1/characters/:id/poisonings` (workspace spec 042). */
export class PoisonCharacterDto {
  @ApiProperty({ type: PoisonDataDto })
  @ValidateNested()
  @Type(() => PoisonDataDto)
  poison: PoisonDataDto;

  @ApiPropertyOptional({ description: 'Open-ended roll; missing, the server rolls it' })
  @IsOptional()
  @IsNumber()
  roll?: number;

  @ApiPropertyOptional({ description: 'Poison RR bonus; missing, the one of the sheet' })
  @IsOptional()
  @IsNumber()
  bonus?: number;

  @ApiPropertyOptional({ type: [PoisonRrModifierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoisonRrModifierDto)
  modifiers?: PoisonRrModifierDto[];

  static toCommand(characterId: string, dto: PoisonCharacterDto, userId: string, roles: string[]): PoisonCharacterCommand {
    return new PoisonCharacterCommand(characterId, { ...dto.poison }, dto.roll, dto.modifiers ?? [], dto.bonus, userId, roles);
  }
}

/** `POST /v1/characters/:id/injuries/:injuryId/antidote` (workspace spec 042). */
export class GiveAntidoteDto {
  @ApiProperty({ type: String, enum: ANTIDOTE_SOURCES })
  @IsIn(ANTIDOTE_SOURCES)
  source: AntidoteSource;

  @ApiPropertyOptional({ description: 'item: the antidote of a character of the game; one dose is spent' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({ description: 'external and magic: what it is' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: [String], description: `Poison categories it cures, or ${ANY_POISON}` })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...POISON_CATEGORIES, ANY_POISON], { each: true })
  categories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  withinHours?: number | null;

  static toCommand(characterId: string, injuryId: string, dto: GiveAntidoteDto, userId: string, roles: string[]): GiveAntidoteCommand {
    return new GiveAntidoteCommand(characterId, injuryId, { ...dto }, userId, roles);
  }
}

export class PoisonCharacterResultDto {
  @ApiProperty({ type: CharacterDto })
  character: CharacterDto;

  @ApiProperty({ type: Object, description: 'roll, bonus, attack level, breakdown, total, required, resisted, failure, severity' })
  rr: PoisonCharacterResult['rr'];

  @ApiPropertyOptional({ description: 'The poisoning, when the RR failed' })
  injuryId?: string;

  static from(result: PoisonCharacterResult): PoisonCharacterResultDto {
    const dto = new PoisonCharacterResultDto();
    dto.character = CharacterDto.fromEntity(result.character);
    dto.rr = result.rr;
    dto.injuryId = result.injury?.id;
    return dto;
  }
}

export class AntidoteResultDto {
  @ApiProperty({ type: CharacterDto })
  character: CharacterDto;

  @ApiProperty()
  injuryId: string;

  @ApiProperty()
  neutralized: boolean;

  static from(result: GiveAntidoteResult): AntidoteResultDto {
    const dto = new AntidoteResultDto();
    dto.character = CharacterDto.fromEntity(result.character);
    dto.injuryId = result.injury.id;
    dto.neutralized = result.neutralized;
    return dto;
  }
}
