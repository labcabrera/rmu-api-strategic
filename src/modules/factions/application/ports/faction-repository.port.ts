import { Faction } from '../../domain/aggregates/faction.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export interface FactionRepository extends BaseRepository<Faction> {
  findByGameId(gameId: string): Promise<Faction[]>;
}

export const FACTION_REPOSITORY = Symbol('FactionRepository');
