import { Injectable } from '@nestjs/common';
import { BaseEntityGuard } from '../../../shared/infrastructure/security/base-entity-guard';
import { GameGuardPort } from '../../application/ports/game-guard.port';
import { Game } from '../../domain/aggregates/game.aggregate';

@Injectable()
export class GameGuardAdapter extends BaseEntityGuard<Game> implements GameGuardPort {}
