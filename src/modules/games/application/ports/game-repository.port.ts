import { Game } from '../../domain/aggregates/game.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export interface GameRepository extends BaseRepository<Game> {
  findByRealm(realmId: string): Promise<Game[]>;
}

export const GAME_REPOSITORY = Symbol('GameRepository');
