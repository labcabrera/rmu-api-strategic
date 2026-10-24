import { CharacterAccess } from '../../services/character-access.service.js';
import type { SortCriteria } from '../../../../shared/application/criteria/query-criteria.js';
import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { GetCharactersQuery } from '../queries/get-characters.query.js';
import { Page } from '../../../../shared/application/pagination/page.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';

@QueryHandler(GetCharactersQuery)
export class GetCharactersHandler implements IQueryHandler<GetCharactersQuery, Page<Character>> {
  private readonly logger = new Logger(GetCharactersHandler.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetCharactersQuery): Promise<Page<Character>> {
    this.logger.debug('Finding characters with query: ', query.rsql);
    // Only what the user can read: their characters and those of the games they can read (F-strategic-15).
    const filter = await this.characterAccess.readFilter(query.userId, query.roles);
    const sort: SortCriteria = { name: 'asc' };
    return await this.characterRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
