import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { GetGameQuery } from '../get-game.query';
import { Game } from 'src/modules/games/domain/entities/game.aggregate';
import * as gameRepository from '../../ports/out/game-repository';
import { NotFoundError } from 'src/modules/shared/domain/errors';

@QueryHandler(GetGameQuery)
export class GetGameQueryHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(@Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) {
      throw new NotFoundError('Game', query.gameId);
    }
    return data;
  }
}
