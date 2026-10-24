import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from '../../../domain/aggregates/faction.aggregate';
import type { FactionRepository } from '../../ports/faction.repository';
import { GetFactionsQuery } from '../queries/get-factions.query';
import { Page } from '../../../../shared/domain/entities/page';

@QueryHandler(GetFactionsQuery)
export class GetFactionsQueryHandler implements IQueryHandler<GetFactionsQuery, Page<Faction>> {
  constructor(@Inject('FactionRepository') private readonly factionRepository: FactionRepository) {}

  async execute(query: GetFactionsQuery): Promise<Page<Faction>> {
    return await this.factionRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
