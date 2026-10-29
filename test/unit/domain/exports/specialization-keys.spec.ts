import { describe, expect, it } from 'vitest';
import { normalizeSkillSpecializations } from '../../../../src/modules/exports/domain/import/specialization-keys.js';
import type { CharacterExportSkill } from '../../../../src/modules/exports/domain/format/export-format.js';

const skill = (specialization: string | null, overrides: Partial<CharacterExportSkill> = {}): CharacterExportSkill => ({
  skillId: 'language-spoken',
  specialization,
  statistics: ['me'],
  development: [2, 4],
  professional: null,
  ranks: 0,
  ranksDeveloped: 0,
  cultureRanks: 0,
  devPointsSpent: { normal: 0, bonus: 0 },
  knackBonus: null,
  ...overrides,
});

describe('normalizeSkillSpecializations (spec 050)', () => {
  const categoryOf = (skillId: string) => (skillId === 'language-spoken' ? 'language' : undefined);

  it('merges the skills that end with the same key, as the racial and culture entries of an orcish language', () => {
    const skills = normalizeSkillSpecializations(
      [
        skill('Orcish-tongues'),
        skill('Orcish tongues', { ranks: 11, cultureRanks: 11, devPointsSpent: { normal: 2, bonus: 0 }, professional: ['professional'] }),
        skill('Black-Speech', { ranks: 1, cultureRanks: 1 }),
      ],
      categoryOf,
    );
    expect(skills).toEqual([
      skill('orcish-tongues', { ranks: 11, cultureRanks: 11, devPointsSpent: { normal: 2, bonus: 0 }, professional: ['professional'] }),
      skill('black-speech', { ranks: 1, cultureRanks: 1 }),
    ]);
  });

  it('keeps the specializations of skills outside the catalog', () => {
    const racial = skill('Orcs', { skillId: 'racial-lore' });
    expect(normalizeSkillSpecializations([racial], categoryOf)).toEqual([racial]);
  });
});
