import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from '../../../domain/aggregates/faction';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port';
import { GetFactionsQuery } from '../queries/get-factions.query';
import { Page } from '../../../../shared/application/pagination/page';

@QueryHandler(GetFactionsQuery)
export class GetFactionsQueryHandler implements IQueryHandler<GetFactionsQuery, Page<Faction>> {
  constructor(@Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository) {}

  async execute(query: GetFactionsQuery): Promise<Page<Faction>> {
    return await this.factionRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
