import { ValidationError } from '../../../../shared/domain/errors/errors.js';

/** Workspace spec 076, A7: the talent that grants language ranks. */
export const MULTILINGUAL_TRAIT_ID = 'multilingual';
export const MULTILINGUAL_SKILL_IDS = ['language-spoken', 'language-written'] as const;
export type MultilingualSkillId = (typeof MULTILINGUAL_SKILL_IDS)[number];
/** Ranks of the talent: all of them in one language, or half of them in each of two. */
export const MULTILINGUAL_RANKS = 10;

export interface LanguageRanks {
  skillId: MultilingualSkillId;
  specialization: string;
  ranks: number;
}

const distributionError = (message: string) => new ValidationError(message, 'err-multilingual-distribution');

/**
 * Checks the distribution of the ranks of Multilingual: 10 ranks in one language or 5 in each of two. The player
 * splits the ranks of a language between spoken and written as they like (P1). The specializations must already be
 * the keys of the `language` enumeration.
 */
export function validateMultilingualRanks(entries: LanguageRanks[] | undefined): void {
  if (!entries?.length) throw distributionError('Multilingual needs the languages that receive its ranks (languageRanks)');
  const seen = new Set<string>();
  const byLanguage = new Map<string, number>();
  entries.forEach(entry => {
    if (!MULTILINGUAL_SKILL_IDS.includes(entry.skillId)) {
      throw distributionError(`Multilingual only grants ranks in ${MULTILINGUAL_SKILL_IDS.join(' or ')}, not in ${entry.skillId}`);
    }
    if (!entry.specialization) throw distributionError('Every language of Multilingual needs its specialization');
    if (!Number.isInteger(entry.ranks) || entry.ranks < 1) throw distributionError(`Invalid Multilingual ranks ${entry.ranks}`);
    const key = `${entry.skillId}#${entry.specialization}`;
    if (seen.has(key)) throw distributionError(`Multilingual repeats ${entry.skillId} (${entry.specialization})`);
    seen.add(key);
    byLanguage.set(entry.specialization, (byLanguage.get(entry.specialization) || 0) + entry.ranks);
  });
  const totals = [...byLanguage.values()];
  const valid =
    (totals.length === 1 && totals[0] === MULTILINGUAL_RANKS) ||
    (totals.length === 2 && totals.every(total => total === MULTILINGUAL_RANKS / 2));
  if (!valid) {
    throw distributionError(
      `Multilingual grants ${MULTILINGUAL_RANKS} ranks in one language or ${MULTILINGUAL_RANKS / 2} in each of two languages`,
    );
  }
}
