import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  CreateChronicleChapterCommand,
  ReorderChronicleChaptersCommand,
  UpdateChronicleChapterCommand,
} from '../../../application/cqrs/commands/chronicle-chapter.commands.js';
import {
  CHRONICLE_CHAPTER_VISIBILITIES,
  type ChronicleChapterVisibility,
  MAX_CHAPTER_TITLE_LENGTH,
  MAX_CHRONICLE_CHAPTERS,
} from '../../../domain/value-objects/chronicle-chapter-visibility.vo.js';

// The content has no @MaxLength: the aggregate rejects a longer one with the code chapter-content-too-long.

export class CreateChronicleChapterDto {
  @ApiProperty({ description: 'Strategic game' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ maxLength: MAX_CHAPTER_TITLE_LENGTH, example: 'The ford of the river' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CHAPTER_TITLE_LENGTH)
  title: string;

  @ApiPropertyOptional({ description: 'Markdown, up to 200000 characters (chapter-content-too-long otherwise)', default: '' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: CHRONICLE_CHAPTER_VISIBILITIES, default: 'public' })
  @IsIn(CHRONICLE_CHAPTER_VISIBILITIES)
  @IsOptional()
  visibility?: ChronicleChapterVisibility;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, description: 'Day of the campaign calendar' })
  @IsInt()
  @Min(1)
  @IsOptional()
  campaignDate?: number | null;

  static toCommand(dto: CreateChronicleChapterDto, userId: string, roles: string[]): CreateChronicleChapterCommand {
    return new CreateChronicleChapterCommand(dto.gameId, dto.title, dto.content, dto.visibility, dto.campaignDate, userId, roles);
  }
}

export class UpdateChronicleChapterDto {
  @ApiPropertyOptional({ maxLength: MAX_CHAPTER_TITLE_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CHAPTER_TITLE_LENGTH)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Markdown, up to 200000 characters (chapter-content-too-long otherwise)' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: CHRONICLE_CHAPTER_VISIBILITIES })
  @IsIn(CHRONICLE_CHAPTER_VISIBILITIES)
  @IsOptional()
  visibility?: ChronicleChapterVisibility;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, description: 'Day of the campaign calendar; null clears it' })
  @IsInt()
  @Min(1)
  @IsOptional()
  campaignDate?: number | null;

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(chapterId: string, dto: UpdateChronicleChapterDto, userId: string, roles: string[]): UpdateChronicleChapterCommand {
    return new UpdateChronicleChapterCommand(
      chapterId,
      dto.title,
      dto.content,
      dto.visibility,
      dto.campaignDate,
      userId,
      roles,
      dto.version,
    );
  }
}

export class ReorderChronicleChaptersDto {
  @ApiProperty({ description: 'Strategic game' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ type: [String], description: 'Every chapter of the chronicle, once, in the new order' })
  @IsArray()
  @ArrayMaxSize(MAX_CHRONICLE_CHAPTERS)
  @IsString({ each: true })
  ids: string[];

  static toCommand(dto: ReorderChronicleChaptersDto, userId: string, roles: string[]): ReorderChronicleChaptersCommand {
    return new ReorderChronicleChaptersCommand(dto.gameId, dto.ids, userId, roles);
  }
}
