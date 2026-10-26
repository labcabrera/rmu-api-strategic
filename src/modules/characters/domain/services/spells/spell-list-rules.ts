import { ValidationError } from '../../../../shared/domain/errors/errors.js';

export type SpellListType = 'base' | 'open' | 'closed' | 'evil';

/** Spell list of rmu-api-spells, as strategic reads it. */
export interface SpellListInfo {
  id: string;
  code: string;
  name: string;
  realms: string[];
  type: SpellListType;
  professionId: string | null;
}

export const BASE_SPELL_LIST = 'base-spell-list';
export const OPEN_SPELL_LIST = 'open-spell-list';
export const CLOSED_SPELL_LIST = 'closed-spell-list';
export const ARCANE_SPELL_LIST = 'arcane-spell-list';
export const RESTRICTED_SPELL_LIST = 'restricted-spell-list';

/** Skills of the Spellcasting category whose specialization is a spell list (by its code). */
export const SPELL_LIST_SKILLS = [BASE_SPELL_LIST, OPEN_SPELL_LIST, CLOSED_SPELL_LIST, ARCANE_SPELL_LIST, RESTRICTED_SPELL_LIST];

export const isSpellListSkill = (skillId: string): boolean => SPELL_LIST_SKILLS.includes(skillId);

/**
 * Development cost key of the profession for the Spellcasting skills (Core Law table 2-4a): the category of the skills
 * is `spellcasting`, but the professions cost each kind of list apart.
 */
export const SPELLCASTING_COST_KEYS: Record<string, string> = {
  [BASE_SPELL_LIST]: 'spells-base-open',
  [OPEN_SPELL_LIST]: 'spells-base-open',
  [CLOSED_SPELL_LIST]: 'spells-closed',
  [ARCANE_SPELL_LIST]: 'spells-arcane',
  [RESTRICTED_SPELL_LIST]: 'spells-restricted',
  'magic-ritual': 'spells-ritual-magic',
};

/** List type modifier of the Spellcasting Roll (Spell Law 4.2): own Base +5, Open 0, Closed -5, any other -10. */
const LIST_TYPE_MODIFIERS: Record<string, number> = {
  [BASE_SPELL_LIST]: 5,
  [OPEN_SPELL_LIST]: 0,
  [CLOSED_SPELL_LIST]: -5,
  [ARCANE_SPELL_LIST]: -10,
  [RESTRICTED_SPELL_LIST]: -10,
};

export const listTypeModifier = (skillId: string): number => LIST_TYPE_MODIFIERS[skillId] ?? -10;

/**
 * Skill a character develops a list with (Core Law 3.22): a Base list of its own profession is Base, an Open list Open,
 * a Closed or Evil list Closed (spec 029), and the Base list of another profession Restricted.
 */
export function spellListSkill(list: SpellListInfo, professionId: string): string {
  switch (list.type) {
    case 'base':
      return list.professionId === professionId ? BASE_SPELL_LIST : RESTRICTED_SPELL_LIST;
    case 'open':
      return OPEN_SPELL_LIST;
    default:
      return CLOSED_SPELL_LIST;
  }
}

/** No ranks in lists of other realms (Core Law 3.22); a hybrid list is valid for either realm. */
export function checkSpellListRealm(list: SpellListInfo, realms: string[]): void {
  if (!list.realms.some(realm => realms.includes(realm))) {
    throw new ValidationError(
      `Spell list ${list.code} (${list.realms.join(', ')}) is not of the realms of the character (${realms.join(', ')})`,
      'err-spell-list-wrong-realm',
    );
  }
}
