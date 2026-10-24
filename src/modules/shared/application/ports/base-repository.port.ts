import { QueryCriteria, type SortCriteria } from '../criteria/query-criteria.js';
import { Page } from '../pagination/page.js';

export interface BaseRepository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string | undefined, page: number, size: number, filter?: QueryCriteria, sort?: SortCriteria): Promise<Page<I>>;

  /** Stores a new entity; an id that already exists is a ConflictError (`duplicate-key`). */
  save(entity: I): Promise<I>;

  /**
   * Replaces the stored entity, provided it is still at the version it was loaded with: otherwise a ConflictError
   * (`version-conflict`). Fields that are now undefined are removed.
   */
  update(entity: I): Promise<I>;

  deleteById(id: string): Promise<I | null>;
}
