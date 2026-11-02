import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Page } from '../../../../shared/application/pagination/page.js';
import type { GameTimeLogEntry } from '../../../domain/value-objects/game-time-log-entry.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { type GameTimeLogRepository, GAME_TIME_LOG_REPOSITORY } from '../../ports/game-time-log-repository.port.js';
import { GameAccess } from '../../services/game-access.service.js';
import { GetGameTimeLogQuery } from '../queries/get-game-time-log.query.js';

/** Time log of a campaign (spec 065), with the read access of the game. */
@QueryHandler(GetGameTimeLogQuery)
export class GetGameTimeLogHandler implements IQueryHandler<GetGameTimeLogQuery, Page<GameTimeLogEntry>> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_TIME_LOG_REPOSITORY) private readonly timeLogRepository: GameTimeLogRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetGameTimeLogQuery): Promise<Page<GameTimeLogEntry>> {
    const game = await this.gameRepository.findById(query.gameId);
    if (!game) throw new NotFoundError('Game', query.gameId);
    await this.gameAccess.checkRead(game, query.userId, query.roles);
    return this.timeLogRepository.findByGameId(query.gameId, query.page, query.size);
  }
}
