import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

export interface GameEventBusPort {
  publish(event: DomainEvent<Game>): void;
  created(entity: Game): Promise<void>;
  updated(entity: Game): Promise<void>;
  deleted(entity: Game): Promise<void>;
}
