import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { GetGamesQuery } from '../get-games.query';
import { Page } from 'src/modules/shared/domain/entities/page.entity';
import * as gameRepository from '../../ports/out/game-repository';
import { Game } from 'src/modules/games/domain/entities/game.aggregate';

@QueryHandler(GetGamesQuery)
export class GetGamesQueryHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  constructor(@Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
