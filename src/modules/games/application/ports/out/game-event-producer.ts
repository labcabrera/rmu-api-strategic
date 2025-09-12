import { Game } from 'src/modules/games/domain/entities/game.aggregate';

export interface GameEventProducer {
  created(entity: Game): Promise<void>;
  updated(entity: Game): Promise<void>;
  deleted(entity: Game): Promise<void>;
}
