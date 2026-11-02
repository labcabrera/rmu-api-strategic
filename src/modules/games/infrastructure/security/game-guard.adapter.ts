import { Injectable } from '@nestjs/common';
import { BaseEntityGuard } from '../../../shared/infrastructure/security/base-entity-guard.js';
import type { GameGuardPort } from '../../application/ports/game-guard.port.js';
import { Game } from '../../domain/aggregates/game.js';

@Injectable()
export class GameGuardAdapter extends BaseEntityGuard<Game> implements GameGuardPort {}
