import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GetGameQuery } from '../queries/get-game.query.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { GameAccess } from '../../services/game-access.service.js';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const current = await this.gameRepository.findById(query.gameId);
    if (!current) throw new NotFoundError('Game', query.gameId);
    // Public, its owner, its players or an admin
    await this.gameAccess.checkRead(current, query.userId, query.roles);
    return current;
  }
}
