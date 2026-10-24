import { Page } from '../../../shared/domain/entities/page';
import { HealingLogEntry } from '../../domain/value-objects/healing-log-entry.vo';

/** Healing log of the characters, in its own collection because it grows with every rest and treatment. */
export interface HealingLogRepository {
  saveAll(characterId: string, gameId: string, entries: HealingLogEntry[]): Promise<void>;

  findByCharacterId(characterId: string, page: number, size: number): Promise<Page<HealingLogEntry>>;

  deleteByCharacterId(characterId: string): Promise<void>;
}
