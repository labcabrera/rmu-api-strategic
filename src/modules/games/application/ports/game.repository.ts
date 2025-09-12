import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { Page } from 'src/modules/shared/domain/entities/page.entity';

export interface GameRepository {
  findById(id: string): Promise<Game | null>;

  findByRealm(realmId: string): Promise<Game[]>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Game>>;

  save(game: Game): Promise<Game>;

  update(gameId: string, game: Partial<Game>): Promise<Game>;

  deleteById(id: string): Promise<Game | null>;
}
