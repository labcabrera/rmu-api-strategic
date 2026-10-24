import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GetGameQuery } from '../queries/get-game.query.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port.js';

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
