import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import type { GameRepository } from '../../ports/game.repository';
import { GetGamesQuery } from '../queries/get-games.query';

@QueryHandler(GetGamesQuery)
export class GetGamesQueryHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  constructor(@Inject('GameRepository') private readonly gameRepository: GameRepository) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
