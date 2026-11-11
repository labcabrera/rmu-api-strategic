import type { CharacterSkill } from '../../value-objects/character-skill.vo.js';
import type { IntenseTrainingSkill } from '../../value-objects/character-xp.vo.js';

/** Ranks every skill can take in a level without intense training (Core Law §3). */
export const MAX_RANKS_PER_LEVEL = 2;

/**
 * Category of the core catalog that holds the lore skills and the languages (`language-spoken`, `language-written`,
 * `region-lore`...): core has no separate language category.
 */
export const LORE_CATEGORY_ID = 'lore';
const LANGUAGE_SKILL_PREFIX = 'language-';

/**
 * Lore skills, languages included, are exempt from the twice the level limit of intense training (workspace spec
 * 076, A1 and P2). Skills stored before workspace spec 039 have no category: their id decides.
 */
export function isLoreOrLanguage(skill: Pick<CharacterSkill, 'skillId' | 'categoryId'>): boolean {
  if (skill.categoryId) return skill.categoryId === LORE_CATEGORY_ID;
  return skill.skillId.startsWith(LANGUAGE_SKILL_PREFIX) || skill.skillId.endsWith('lore');
}

/** Intense training stops a skill that already has ranks equal to twice the level (level 0 counts as level 1). */
export function intenseTrainingLimit(level: number): number {
  return 2 * Math.max(level, 1);
}

export function isIntenseTrainingSkill(
  marked: IntenseTrainingSkill | null | undefined,
  skill: Pick<CharacterSkill, 'skillId' | 'specialization'>,
): boolean {
  return !!marked && marked.skillId === skill.skillId && (marked.specialization ?? null) === (skill.specialization ?? null);
}
