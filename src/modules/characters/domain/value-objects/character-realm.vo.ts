import type { StatKey } from './character-stat.vo.js';

export type CharacterRealm = 'channeling' | 'essence' | 'mentalism';

export const CHARACTER_REALMS: CharacterRealm[] = ['channeling', 'essence', 'mentalism'];

/** Realm stat of each realm (Spell Law 4.0): Intuition, Empathy and Presence. */
export const REALM_STATS: Record<CharacterRealm, StatKey> = { channeling: 'in', essence: 'em', mentalism: 'pr' };

/**
 * Stat placeholder of the categories with realm bonus (Spellcasting and Power Manipulation, `R*+R*`): the skill
 * processor resolves it to the realm stat of the character, the lowest one for a hybrid.
 */
export const REALM_STAT_TOKEN = 'realm';

/** Realms of a character: `realmTypes`, or the deprecated single `realmType` of older documents. */
export function characterRealms(
  info: { realmType?: CharacterRealm | null; realmTypes?: CharacterRealm[] | null } | undefined,
): CharacterRealm[] {
  if (info?.realmTypes && info.realmTypes.length > 0) return info.realmTypes;
  return info?.realmType ? [info.realmType] : [];
}
