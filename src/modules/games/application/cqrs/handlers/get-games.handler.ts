import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from '../../../domain/aggregates/game';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { GetGamesQuery } from '../queries/get-games.query';
import { Page } from '../../../../shared/application/pagination/page';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    const filter = this.gameGuard.buildQueryPredicate(query.userId, query.roles);
    const sort = { name: 1 };
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
