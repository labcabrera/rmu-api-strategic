import { Game } from '../../domain/aggregates/game.aggregate';
import { BaseRepository } from '../../../shared/application/ports/base-repository';

export interface GameRepository extends BaseRepository<Game> {
  findByRealm(realmId: string): Promise<Game[]>;
}
