import { EntityGuard } from '../../../shared/application/ports/entity-guard';
import { Game } from '../../domain/aggregates/game.aggregate';

export type GameGuardPort = EntityGuard<Game>;
