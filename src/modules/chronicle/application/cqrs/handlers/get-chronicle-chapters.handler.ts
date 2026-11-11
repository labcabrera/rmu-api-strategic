import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryCriteria } from '../../../../shared/application/criteria/query-criteria.js';
import type { Page } from '../../../../shared/application/pagination/page.js';
import type { ChronicleChapterSummary } from '../../../domain/aggregates/chronicle-chapter.js';
import { canReadVisibility } from '../../../domain/value-objects/chronicle-chapter-visibility.vo.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { GetChronicleChaptersQuery } from '../queries/chronicle-chapter.queries.js';

/**
 * The chronicle of a game, without the content of its chapters, sorted by order: spectators and up (403 below,
 * `cover` included; 404 for a missing game). The private chapters are left out below master.
 */
@QueryHandler(GetChronicleChaptersQuery)
export class GetChronicleChaptersHandler implements IQueryHandler<GetChronicleChaptersQuery, Page<ChronicleChapterSummary>> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(query: GetChronicleChaptersQuery): Promise<Page<ChronicleChapterSummary>> {
    const level = await this.access.levelInExistingGame(query.gameId, query.userId, query.roles);
    this.access.checkReadChronicle(level);
    const inGame = QueryCriteria.eq('gameId', query.gameId);
    const filter = canReadVisibility(level, 'master') ? inGame : QueryCriteria.allOf([inGame, QueryCriteria.eq('visibility', 'public')]);
    return this.repository.findSummaries(query.rsql, query.page, query.size, filter);
  }
}
