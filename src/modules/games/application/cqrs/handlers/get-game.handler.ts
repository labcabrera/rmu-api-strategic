import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import type { GameRepository } from '../../ports/game.repository';
import { GetGameQuery } from '../queries/get-game.query';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(@Inject('GameRepository') private readonly gameRepository: GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) throw new NotFoundError('Game', query.gameId);
    return data;
  }
}
