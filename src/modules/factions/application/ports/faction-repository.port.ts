import { Faction } from '../../domain/aggregates/faction.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export type FactionRepository = BaseRepository<Faction>;

export const FACTION_REPOSITORY = Symbol('FactionRepository');
