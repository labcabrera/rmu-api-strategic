import { specializationKey } from '../../../characters/domain/services/skills/specialization-keys.js';
import type { CharacterExportSkill } from '../format/export-format.js';

const sum = (a: number | null | undefined, b: number | null | undefined) => (a ?? 0) + (b ?? 0);

/**
 * Spec 050: the specializations of a file exported before the keys were normalized (`Orcish tongues`) become keys
 * (`orcish-tongues`), and two skills that end with the same key are merged into one: ranks, culture ranks and points
 * spent add up; the professional and knack marks come from the first one that has them.
 */
export function normalizeSkillSpecializations(
  skills: CharacterExportSkill[],
  specializationOf: (skillId: string) => string | undefined,
): CharacterExportSkill[] {
  const merged = new Map<string, CharacterExportSkill>();
  for (const skill of skills) {
    const specialization = specializationKey(specializationOf(skill.skillId), skill.specialization);
    const id = `${skill.skillId}#${specialization ?? ''}`;
    const current = merged.get(id);
    if (!current) {
      merged.set(id, { ...skill, specialization });
      continue;
    }
    merged.set(id, {
      ...current,
      professional: current.professional ?? skill.professional,
      knackBonus: current.knackBonus ?? skill.knackBonus,
      ranks: sum(current.ranks, skill.ranks),
      ranksDeveloped: sum(current.ranksDeveloped, skill.ranksDeveloped),
      cultureRanks: sum(current.cultureRanks, skill.cultureRanks),
      devPointsSpent: {
        normal: sum(current.devPointsSpent?.normal, skill.devPointsSpent?.normal),
        bonus: sum(current.devPointsSpent?.bonus, skill.devPointsSpent?.bonus),
      },
      ...(current.styleAbilities || skill.styleAbilities
        ? { styleAbilities: [...(current.styleAbilities ?? []), ...(skill.styleAbilities ?? [])] }
        : {}),
    });
  }
  return [...merged.values()];
}
