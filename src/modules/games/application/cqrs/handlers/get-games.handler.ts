import type { SortCriteria } from '../../../../shared/application/criteria/query-criteria.js';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GetGamesQuery } from '../queries/get-games.query.js';
import { Page } from '../../../../shared/application/pagination/page.js';
import { GameAccess } from '../../services/game-access.service.js';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    const filter = await this.gameAccess.readableGames(query.userId, query.roles);
    const sort: SortCriteria = { name: 'asc' };
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
