import type { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Game } from '../../domain/aggregates/game.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export interface GameRepository extends BaseRepository<Game> {
  findByRealm(realmId: string): Promise<Game[]>;

  /** The ids of the games that match the criteria (the games a user can read, for the listings of their children). */
  findIds(criteria: QueryCriteria): Promise<string[]>;
}

export const GAME_REPOSITORY = Symbol('GameRepository');
