import { Page } from '../../../shared/application/pagination/page.js';
import type { HealingLogEntry } from '../../domain/value-objects/healing-log-entry.vo.js';

/** Healing log of the characters, in its own collection because it grows with every rest and treatment. */
export interface HealingLogRepository {
  saveAll(characterId: string, gameId: string, entries: HealingLogEntry[]): Promise<void>;

  findByCharacterId(characterId: string, page: number, size: number): Promise<Page<HealingLogEntry>>;

  deleteByCharacterId(characterId: string): Promise<void>;
}

export const HEALING_LOG_REPOSITORY = Symbol('HealingLogRepository');
