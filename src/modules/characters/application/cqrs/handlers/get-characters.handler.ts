import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { GetCharactersQuery } from '../queries/get-characters.query';
import { Page } from 'src/modules/shared/domain/entities/page';
import type { CharacterRepository } from '../../ports/character.repository';

@QueryHandler(GetCharactersQuery)
export class GetCharactersHandler implements IQueryHandler<GetCharactersQuery, Page<Character>> {
  private readonly logger = new Logger(GetCharactersHandler.name);

  constructor(@Inject('CharacterRepository') private readonly characterRepository: CharacterRepository) {}

  async execute(query: GetCharactersQuery): Promise<Page<Character>> {
    this.logger.debug('Finding characters with query: ', query.rsql);
    const filter = undefined;
    const sort = { name: 1 };
    return await this.characterRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
