import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { GetGameQuery } from '../queries/get-game.query';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const current = await this.gameRepository.findById(query.gameId);
    if (!current) throw new NotFoundError('Game', query.gameId);
    this.gameGuard.checkRead(current, query.userId, query.roles);
    return current;
  }
}
