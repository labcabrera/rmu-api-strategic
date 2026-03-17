import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import type { GameRepository } from '../../ports/game.repository';
import { GetGamesQuery } from '../queries/get-games.query';
import { Page } from 'src/modules/shared/domain/entities/page';
import type { GameGuardPort } from '../../ports/game-guard.port';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameGuardPort') private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    const filter = this.gameGuard.buildQueryPredicate(query.userId, query.roles);
    const sort = { name: 1 };
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
