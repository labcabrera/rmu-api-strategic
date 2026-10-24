import { Faction } from '../../domain/aggregates/faction.js';
import { Page } from '../../../shared/application/pagination/page.js';

export interface FactionRepository {
  findById(id: string): Promise<Faction | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Faction>>;

  save(faction: Faction): Promise<Faction>;

  update(factionId: string, faction: Partial<Faction>): Promise<Faction>;

  deleteById(id: string): Promise<Faction | null>;
}

export const FACTION_REPOSITORY = Symbol('FactionRepository');
