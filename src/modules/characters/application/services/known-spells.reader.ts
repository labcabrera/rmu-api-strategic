import { Inject, Injectable } from '@nestjs/common';
import type { Character } from '../../domain/aggregates/character.js';
import { isSpellListSkill, listTypeModifier } from '../../domain/services/spells/spell-list-rules.js';
import type { CharacterSkill } from '../../domain/value-objects/character-skill.vo.js';
import { type SpellListClientPort, type SpellResponse, SPELL_LIST_CLIENT } from '../ports/spell-list-client.port.js';

export interface KnownSpell {
  spell: SpellResponse;
  /** Power points to cast it: the spell level unless the spell says otherwise */
  powerPoints: number;
}

export interface KnownSpellList {
  skillId: string;
  code: string;
  /** Null when rmu-api-spells has no list with that code */
  spellListId: string | null;
  name: string | null;
  type: string | null;
  realms: string[];
  ranks: number;
  /** List type modifier of the Spellcasting Roll: +5 own Base, 0 Open, -5 Closed, -10 any other */
  listTypeModifier: number;
  /** Spells up to the ranks in the list (Core Law 3.22) */
  spells: KnownSpell[];
}

/** Spells a character knows (spec 029): for each spell list skill, the spells of level up to its ranks. Nothing stored. */
@Injectable()
export class KnownSpellsReader {
  constructor(@Inject(SPELL_LIST_CLIENT) private readonly spellListClient: SpellListClientPort) {}

  read(character: Character): Promise<KnownSpellList[]> {
    const skills = character.skills.filter(skill => isSpellListSkill(skill.skillId) && skill.specialization);
    return Promise.all(skills.map(skill => this.knownList(skill)));
  }

  private async knownList(skill: CharacterSkill): Promise<KnownSpellList> {
    const code = skill.specialization!;
    const list = await this.spellListClient.getSpellListByCode(code);
    const spells = list ? await this.spellListClient.getSpellsByListId(list.id) : [];
    return {
      skillId: skill.skillId,
      code,
      spellListId: list?.id ?? null,
      name: list?.name ?? null,
      type: list?.type ?? null,
      realms: list?.realms ?? [],
      ranks: skill.ranks,
      listTypeModifier: listTypeModifier(skill.skillId),
      spells: spells
        .filter(spell => spell.level <= skill.ranks)
        .map(spell => ({ spell, powerPoints: spell.modifiers?.powerPoints ?? spell.level })),
    };
  }
}
