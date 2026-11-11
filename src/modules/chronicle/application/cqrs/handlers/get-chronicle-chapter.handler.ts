import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ChronicleChapter } from '../../../domain/aggregates/chronicle-chapter.js';
import { ChapterNotFoundError } from '../../../domain/errors/chronicle.errors.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { GetChronicleChapterQuery } from '../queries/chronicle-chapter.queries.js';

/** One chapter with its content; a private one is a 404 below master (spec 102, decision 3). */
@QueryHandler(GetChronicleChapterQuery)
export class GetChronicleChapterHandler implements IQueryHandler<GetChronicleChapterQuery, ChronicleChapter> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(query: GetChronicleChapterQuery): Promise<ChronicleChapter> {
    const chapter = await this.repository.findById(query.chapterId);
    if (!chapter) throw new ChapterNotFoundError(query.chapterId);
    await this.access.checkReadChapter(chapter, query.userId, query.roles);
    return chapter;
  }
}
