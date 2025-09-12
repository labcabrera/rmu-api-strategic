import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { Character } from '../../../domain/aggregates/character.aggregate';
import * as characterRepository from '../../ports/character.repository';
import { GetCharactersQuery } from '../queries/get-characters.query';

@QueryHandler(GetCharactersQuery)
export class GetCharactersHandler implements IQueryHandler<GetCharactersQuery, Page<Character>> {
  private readonly logger = new Logger(GetCharactersHandler.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(query: GetCharactersQuery): Promise<Page<Character>> {
    this.logger.debug('Finding characters with query: ', query.rsql);
    return await this.characterRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
