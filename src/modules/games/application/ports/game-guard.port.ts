import type { EntityGuard } from '../../../shared/application/ports/entity-guard.port.js';
import { Game } from '../../domain/aggregates/game.js';

export type GameGuardPort = EntityGuard<Game>;

export const GAME_GUARD = Symbol('GameGuardPort');
