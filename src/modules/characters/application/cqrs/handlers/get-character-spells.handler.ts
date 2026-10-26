import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { KnownSpellsReader, type KnownSpellList } from '../../services/known-spells.reader.js';
import { GetCharacterSpellsQuery } from '../queries/get-character-spells.query.js';

export type { KnownSpell, KnownSpellList } from '../../services/known-spells.reader.js';

/** Spells a character knows (spec 029). */
@QueryHandler(GetCharacterSpellsQuery)
export class GetCharacterSpellsHandler implements IQueryHandler<GetCharacterSpellsQuery, KnownSpellList[]> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly knownSpells: KnownSpellsReader,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetCharacterSpellsQuery): Promise<KnownSpellList[]> {
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId);
    await this.characterAccess.checkRead(character, query.userId, query.roles);
    return this.knownSpells.read(character);
  }
}
