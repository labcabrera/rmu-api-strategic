import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { GetCharacterQuery } from '../queries/get-character.query.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';

@QueryHandler(GetCharacterQuery)
export class GetCharacterHandler implements IQueryHandler<GetCharacterQuery, Character> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetCharacterQuery): Promise<Character> {
    const data = await this.characterRepository.findById(query.characterId);
    if (!data) throw new NotFoundError('Character', query.characterId);
    // Its owner, or whoever can read its game (F-strategic-15).
    await this.characterAccess.checkRead(data, query.userId, query.roles);
    return data;
  }
}
