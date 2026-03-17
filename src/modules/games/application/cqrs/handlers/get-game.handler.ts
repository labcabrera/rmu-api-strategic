import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import type { GameRepository } from '../../ports/game.repository';
import { GetGameQuery } from '../queries/get-game.query';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { GameGuardPort } from '../../ports/game-guard.port';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameGuardPort') private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const current = await this.gameRepository.findById(query.gameId);
    if (!current) throw new NotFoundError('Game', query.gameId);
    this.gameGuard.checkRead(current, query.userId, query.roles);
    return current;
  }
}
