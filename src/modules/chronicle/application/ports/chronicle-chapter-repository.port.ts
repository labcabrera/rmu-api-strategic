import type { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';
import type { Page } from '../../../shared/application/pagination/page.js';
import type { ChronicleChapter, ChronicleChapterSummary } from '../../domain/aggregates/chronicle-chapter.js';

/**
 * The chapters of the chronicles (collection `chronicle-chapters`). update() never writes `order`: only
 * updateOrder() does, so a PATCH made on a copy read before a reorder does not undo it.
 */
export interface ChronicleChapterRepository extends BaseRepository<ChronicleChapter> {
  /** The chapters without their content, sorted by order. */
  findSummaries(rsql: string | undefined, page: number, size: number, filter: QueryCriteria): Promise<Page<ChronicleChapterSummary>>;

  /** The ids of the chapters of a game, sorted by order. */
  findIdsByGameId(gameId: string): Promise<string[]>;

  countByGameId(gameId: string): Promise<number>;

  /** The highest order of the chapters of a game, or -1 when it has none. */
  maxOrder(gameId: string): Promise<number>;

  /** Sets `order` = position in `ids` to each chapter of the game, without moving their version. */
  updateOrder(gameId: string, ids: string[]): Promise<void>;

  /** Returns how many it deleted. */
  deleteByGameId(gameId: string): Promise<number>;
}

export const CHRONICLE_CHAPTER_REPOSITORY = Symbol('ChronicleChapterRepository');
