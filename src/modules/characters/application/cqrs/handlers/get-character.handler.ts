import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { GetCharacterQuery } from '../queries/get-character.query';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { CharacterRepository } from '../../ports/character.repository';

@QueryHandler(GetCharacterQuery)
export class GetCharacterHandler implements IQueryHandler<GetCharacterQuery, Character> {
  constructor(@Inject('CharacterRepository') private readonly characterRepository: CharacterRepository) {}

  async execute(query: GetCharacterQuery): Promise<Character> {
    const data = await this.characterRepository.findById(query.characterId);
    if (!data) throw new NotFoundError('Character', query.characterId);

    return data;
  }
}
