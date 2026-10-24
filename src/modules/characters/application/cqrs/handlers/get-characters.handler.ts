import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character';
import { GetCharactersQuery } from '../queries/get-characters.query';
import { Page } from '../../../../shared/application/pagination/page';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';

@QueryHandler(GetCharactersQuery)
export class GetCharactersHandler implements IQueryHandler<GetCharactersQuery, Page<Character>> {
  private readonly logger = new Logger(GetCharactersHandler.name);

  constructor(@Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository) {}

  async execute(query: GetCharactersQuery): Promise<Page<Character>> {
    this.logger.debug('Finding characters with query: ', query.rsql);
    const filter = undefined;
    const sort = { name: 1 };
    return await this.characterRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
