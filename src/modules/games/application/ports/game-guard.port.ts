import { EntityGuard } from '../../../shared/application/ports/entity-guard.port';
import { Game } from '../../domain/aggregates/game';

export type GameGuardPort = EntityGuard<Game>;

export const GAME_GUARD = Symbol('GameGuardPort');
