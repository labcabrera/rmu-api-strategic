import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from '../../../domain/aggregates/faction';
import { GetFactionQuery } from '../queries/get-faction.query';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';

@QueryHandler(GetFactionQuery)
export class GetFactionQueryHandler implements IQueryHandler<GetFactionQuery, Faction> {
  constructor(@Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository) {}

  async execute(query: GetFactionQuery): Promise<Faction> {
    const data = await this.factionRepository.findById(query.factionId);
    if (!data) throw new NotFoundError('Faction', query.factionId);

    return data;
  }
}
