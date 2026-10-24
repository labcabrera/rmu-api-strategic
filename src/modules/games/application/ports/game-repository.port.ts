import { Game } from '../../domain/aggregates/game';
import { BaseRepository } from '../../../shared/application/ports/base-repository.port';

export interface GameRepository extends BaseRepository<Game> {
  findByRealm(realmId: string): Promise<Game[]>;
}

export const GAME_REPOSITORY = Symbol('GameRepository');
