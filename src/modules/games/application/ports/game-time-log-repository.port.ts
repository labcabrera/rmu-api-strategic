import { Page } from '../../../shared/application/pagination/page.js';
import type { GameTimeLogEntry } from '../../domain/value-objects/game-time-log-entry.vo.js';

/** Time log of the campaigns (spec 065), in its own collection. */
export interface GameTimeLogRepository {
  save(entry: GameTimeLogEntry): Promise<GameTimeLogEntry>;

  /** Most recent first */
  findByGameId(gameId: string, page: number, size: number): Promise<Page<GameTimeLogEntry>>;

  deleteByGameId(gameId: string): Promise<void>;
}

export const GAME_TIME_LOG_REPOSITORY = Symbol('GameTimeLogRepository');
