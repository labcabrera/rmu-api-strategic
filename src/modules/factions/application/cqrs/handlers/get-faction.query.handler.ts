import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import { GetFactionQuery } from '../queries/get-faction.query';
import type { FactionRepository } from '../../ports/out/faction-repository';

@QueryHandler(GetFactionQuery)
export class GetFactionQueryHandler implements IQueryHandler<GetFactionQuery, Faction> {
  constructor(@Inject('FactionRepository') private readonly factionRepository: FactionRepository) {}

  async execute(query: GetFactionQuery): Promise<Faction> {
    const data = await this.factionRepository.findById(query.factionId);
    if (!data) {
      throw new NotFoundError('Faction', query.factionId);
    }
    return data;
  }
}
