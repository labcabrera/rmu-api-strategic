import type { SpellListInfo } from '../../domain/services/spells/spell-list-rules.js';

/** Spell lists and spells of rmu-api-spells (spec 029): always read through its API, never copied. */
export interface SpellListClientPort {
  /** The list with that code, or undefined when there is none */
  getSpellListByCode(code: string): Promise<SpellListInfo | undefined>;

  /** Every spell of a list, ordered by level */
  getSpellsByListId(spellListId: string): Promise<SpellResponse[]>;
}

export const SPELL_LIST_CLIENT = Symbol('SpellListClientPort');

/** A spell as rmu-api-spells returns it: strategic reads the level and the power points, and passes the rest through. */
export interface SpellResponse {
  id: string;
  spellListId: string;
  name: string;
  level: number;
  modifiers?: { powerPoints?: number | null } & Record<string, unknown>;
  [key: string]: unknown;
}
