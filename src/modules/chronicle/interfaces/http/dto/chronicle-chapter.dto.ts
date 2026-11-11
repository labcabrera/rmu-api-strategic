import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import type { ChronicleChapter, ChronicleChapterSummary } from '../../../domain/aggregates/chronicle-chapter.js';
import {
  CHRONICLE_CHAPTER_VISIBILITIES,
  type ChronicleChapterVisibility,
} from '../../../domain/value-objects/chronicle-chapter-visibility.vo.js';

/** A chapter in the listing: everything but its content (workspace spec 102, decision 8). */
export class ChronicleChapterSummaryDto {
  @ApiProperty({ example: '0b6f8a52-3c9e-4f0e-9a51-2a1d4e7f9c10' })
  id: string;

  @ApiProperty({ description: 'Version of optimistic concurrency: send it back in the PATCH to detect a concurrent change', example: 0 })
  version: number;

  @ApiProperty({ description: 'Strategic game' })
  gameId: string;

  @ApiProperty({ maxLength: 200, example: 'The ford of the river' })
  title: string;

  @ApiProperty({ enum: CHRONICLE_CHAPTER_VISIBILITIES, description: 'public: members of the game; master: owner and masters only' })
  visibility: ChronicleChapterVisibility;

  @ApiProperty({ description: 'Position in the chronicle; the listing is sorted by it (gaps are possible)', example: 0 })
  order: number;

  @ApiProperty({ type: Number, nullable: true, description: 'Day of the campaign calendar (currentDay, 1 or more)', example: 12 })
  campaignDate: number | null;

  @ApiProperty({ description: 'User who created it' })
  owner: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', description: 'Last change of its title, content, visibility or date' })
  updatedAt: Date;

  @ApiProperty({ description: 'User who changed it last' })
  updatedBy: string;

  static fromSummary(summary: ChronicleChapterSummary): ChronicleChapterSummaryDto {
    return ChronicleChapterSummaryDto.fill(new ChronicleChapterSummaryDto(), summary);
  }

  protected static fill<T extends ChronicleChapterSummaryDto>(dto: T, source: ChronicleChapterSummary): T {
    dto.id = source.id;
    dto.version = source.version;
    dto.gameId = source.gameId;
    dto.title = source.title;
    dto.visibility = source.visibility;
    dto.order = source.order;
    dto.campaignDate = source.campaignDate ?? null;
    dto.owner = source.owner;
    dto.createdAt = source.createdAt;
    dto.updatedAt = source.updatedAt;
    dto.updatedBy = source.updatedBy;
    return dto;
  }
}

export class ChronicleChapterDto extends ChronicleChapterSummaryDto {
  @ApiProperty({ description: 'Markdown, up to 200000 characters' })
  content: string;

  static fromEntity(entity: ChronicleChapter): ChronicleChapterDto {
    const { content, ...props } = entity.getProps();
    const dto = ChronicleChapterSummaryDto.fill(new ChronicleChapterDto(), { ...props, version: entity.version });
    dto.content = content;
    return dto;
  }
}

export class ChronicleChapterPageDto {
  @ApiProperty({ type: [ChronicleChapterSummaryDto] })
  content: ChronicleChapterSummaryDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
