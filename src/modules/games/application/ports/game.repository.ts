import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { BaseRepository } from 'src/modules/shared/application/ports/base-repository';

export interface GameRepository extends BaseRepository<Game> {
  findByRealm(realmId: string): Promise<Game[]>;
}
