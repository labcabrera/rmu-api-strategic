import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { GetFactionQuery } from '../get-faction.query';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import * as factionRepository from '../../ports/out/faction-repository';
import { NotFoundError } from 'src/modules/shared/domain/errors';

@QueryHandler(GetFactionQuery)
export class GetFactionQueryHandler implements IQueryHandler<GetFactionQuery, Faction> {
  constructor(@Inject('FactionRepository') private readonly factionRepository: factionRepository.FactionRepository) {}

  async execute(query: GetFactionQuery): Promise<Faction> {
    const data = await this.factionRepository.findById(query.factionId);
    if (!data) {
      throw new NotFoundError('Faction', query.factionId);
    }
    return data;
  }
}
