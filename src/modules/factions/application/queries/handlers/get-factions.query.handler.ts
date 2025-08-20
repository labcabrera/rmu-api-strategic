import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { GetFactionsQuery } from '../get-factions.query';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import * as factionRepository from '../../ports/out/faction-repository';

@QueryHandler(GetFactionsQuery)
export class GetFactionsQueryHandler implements IQueryHandler<GetFactionsQuery, Page<Faction>> {
  constructor(@Inject('FactionRepository') private readonly factionRepository: factionRepository.FactionRepository) {}

  async execute(query: GetFactionsQuery): Promise<Page<Faction>> {
    return await this.factionRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
