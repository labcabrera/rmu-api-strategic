import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { realmStatBonus } from '../../../domain/services/realms-rules.js';
import { characterRealms, type CharacterRealm } from '../../../domain/value-objects/character-realm.vo.js';
import type { CharacterPower } from '../../../domain/value-objects/character-power.vo.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { KnownSpellsReader, type KnownSpellList } from '../../services/known-spells.reader.js';
import { GetCharacterSpellcastingQuery } from '../queries/get-character-spellcasting.query.js';

/** What a caster brings to a Spellcasting Roll (spec 030): the known spells plus the realm data of the character. */
export interface CharacterSpellcasting {
  characterId: string;
  realms: CharacterRealm[];
  /** Realm stat bonus, the lowest one for a hybrid (Spell Law 4.0) */
  realmStatBonus: number;
  /** Caster level: the overcasting penalty and the RR of the targets use it */
  level: number;
  power: CharacterPower | null;
  lists: KnownSpellList[];
}

@QueryHandler(GetCharacterSpellcastingQuery)
export class GetCharacterSpellcastingHandler implements IQueryHandler<GetCharacterSpellcastingQuery, CharacterSpellcasting> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly knownSpells: KnownSpellsReader,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetCharacterSpellcastingQuery): Promise<CharacterSpellcasting> {
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId);
    await this.characterAccess.checkRead(character, query.userId, query.roles);
    return {
      characterId: character.id,
      realms: characterRealms(character.info),
      realmStatBonus: realmStatBonus(character.info, character.statistics),
      level: character.experience.level,
      power: character.power,
      lists: await this.knownSpells.read(character),
    };
  }
}
