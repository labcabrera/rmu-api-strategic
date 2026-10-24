import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from '../../../domain/aggregates/faction.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { GetFactionsQuery } from '../queries/get-factions.query.js';
import { Page } from '../../../../shared/application/pagination/page.js';

@QueryHandler(GetFactionsQuery)
export class GetFactionsQueryHandler implements IQueryHandler<GetFactionsQuery, Page<Faction>> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetFactionsQuery): Promise<Page<Faction>> {
    // Only the factions of the games the user can read.
    const filter = await this.gameAccess.childrenFilter(query.userId, query.roles);
    return await this.factionRepository.findByRsql(query.rsql, query.page, query.size, filter);
  }
}
