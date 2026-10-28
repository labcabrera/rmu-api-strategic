import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import type { ImportPreview, ImportResult } from '../../../application/services/import.service.js';
import { toStrictBoolean } from '../../../../shared/interfaces/http/dto/strict-boolean.js';

export class ImportQueryDto {
  @ApiPropertyOptional({ description: 'Returns the preview without writing anything', type: Boolean, example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(toStrictBoolean)
  dryRun: boolean | undefined;
}

export class CharacterImportQueryDto extends ImportQueryDto {
  @ApiPropertyOptional({ description: 'The character to take from a faction file', example: 'c2' })
  @IsString()
  @IsOptional()
  @Matches(/^c[1-9][0-9]{0,5}$/)
  characterRef: string | undefined;
}

export class ImportIssueDto {
  @ApiProperty({ description: 'Stable code for the translations', example: 'export-missing-reference' })
  code: string;

  @ApiProperty({ example: 'The race race-001 does not exist here' })
  message: string;

  @ApiPropertyOptional({ description: 'JSON path in the file', example: 'data.character.info.raceId' })
  path?: string;

  @ApiPropertyOptional({ example: 'race' })
  kind?: string;

  @ApiPropertyOptional({ example: 'race-001' })
  id?: string;

  @ApiPropertyOptional({ nullable: true, example: 'Elf' })
  name?: string | null;
}

class ImportStepDto {
  @ApiProperty({ example: 0 })
  from: number;

  @ApiProperty({ example: 1 })
  to: number;

  @ApiProperty({ example: 'Renames hits to hp' })
  description: string;
}

class ImportSummaryDto {
  @ApiProperty({ example: 3 })
  characters: number;

  @ApiProperty({ example: 12 })
  items: number;

  @ApiProperty({ description: 'Gold of the faction plus the gold coins of the items', example: 120.5 })
  gold: number;

  @ApiProperty({ example: 2000 })
  xp: number;
}

class ImportFileCharacterDto {
  @ApiProperty({ example: 'c1' })
  ref: string;

  @ApiProperty({ example: 'Aragorn' })
  name: string;

  @ApiProperty({ example: 3 })
  level: number;

  @ApiProperty({ example: 'Human' })
  raceName: string;
}

class ImportSourceDto {
  @ApiProperty()
  gameName: string;

  @ApiProperty()
  factionName: string;

  @ApiProperty({ nullable: true, type: String })
  realmName: string | null;

  @ApiProperty()
  exportedAt: string;
}

export class ImportPreviewDto {
  @ApiProperty({ enum: ['character', 'faction'], description: 'Kind of the file' })
  kind: string;

  @ApiProperty({ enum: ['character', 'faction'], description: 'What the import creates' })
  target: string;

  @ApiProperty({ description: 'Name of the character or faction to create' })
  name: string;

  @ApiProperty({ description: 'Format version of the file', example: 1 })
  formatVersion: number;

  @ApiProperty({ example: 1 })
  currentFormatVersion: number;

  @ApiProperty({ description: 'Version of rmu-api-strategic that exported it', example: '0.6.0' })
  appVersion: string;

  @ApiProperty({ example: '0.6.0' })
  currentAppVersion: string;

  @ApiPropertyOptional({ description: 'The file was upgraded from this format version', example: 0 })
  upgradedFrom?: number;

  @ApiProperty({ type: [ImportStepDto] })
  steps: ImportStepDto[];

  @ApiProperty({ type: ImportSourceDto })
  source: ImportSourceDto;

  @ApiProperty({ type: ImportSummaryDto })
  summary: ImportSummaryDto;

  @ApiProperty({ type: [ImportFileCharacterDto], description: 'Characters of the file' })
  characters: ImportFileCharacterDto[];

  @ApiPropertyOptional({ example: 'c1' })
  characterRef?: string;

  @ApiProperty({ type: [ImportIssueDto] })
  warnings: ImportIssueDto[];

  @ApiProperty({ type: [ImportIssueDto], description: 'Errors that block the import' })
  errors: ImportIssueDto[];

  static from(preview: ImportPreview): ImportPreviewDto {
    return Object.assign(new ImportPreviewDto(), preview);
  }
}

export class ImportResultDto {
  @ApiProperty({ enum: ['character', 'faction'] })
  kind: string;

  @ApiProperty({ enum: ['character', 'faction'] })
  target: string;

  @ApiProperty({ description: 'Id stored in every created document' })
  importId: string;

  @ApiProperty({ description: 'The faction created, or the one that received the character' })
  factionId: string;

  @ApiProperty({ type: [String] })
  characterIds: string[];

  @ApiProperty({ example: 12 })
  itemCount: number;

  @ApiProperty({ type: [ImportIssueDto] })
  warnings: ImportIssueDto[];

  static from(result: ImportResult): ImportResultDto {
    return Object.assign(new ImportResultDto(), result);
  }
}
