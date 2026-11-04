import { TalentSkillRanksService } from '../../../../../src/modules/characters/application/services/talent-skill-ranks.service.js';
import type { SpecializationCatalogService } from '../../../../../src/modules/characters/application/services/specialization-catalog.service.js';
import type { GameRepository } from '../../../../../src/modules/games/application/ports/game-repository.port.js';
import {
  type LanguageRanks,
  validateMultilingualRanks,
} from '../../../../../src/modules/characters/domain/services/traits/multilingual.js';
import { buildCharacter, skill } from './character.fixture.js';

// Workspace spec 076, A7 and P1. Invented languages and costs
const errorCode = async (fn: () => unknown): Promise<string | undefined> => {
  try {
    await fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

const ranks = (skillId: 'language-spoken' | 'language-written', specialization: string, value: number): LanguageRanks => ({
  skillId,
  specialization,
  ranks: value,
});

describe('Multilingual distribution', () => {
  it('accepts 10 ranks in one language, split between spoken and written as the player likes', () => {
    expect(() => validateMultilingualRanks([ranks('language-spoken', 'north-tongue', 10)])).not.toThrow();
    expect(() =>
      validateMultilingualRanks([ranks('language-spoken', 'north-tongue', 7), ranks('language-written', 'north-tongue', 3)]),
    ).not.toThrow();
  });

  it('accepts 5 ranks in each of two languages', () => {
    expect(() =>
      validateMultilingualRanks([
        ranks('language-spoken', 'north-tongue', 5),
        ranks('language-spoken', 'south-tongue', 2),
        ranks('language-written', 'south-tongue', 3),
      ]),
    ).not.toThrow();
  });

  it('rejects any other distribution with err-multilingual-distribution', async () => {
    const invalid: LanguageRanks[][] = [
      [],
      [ranks('language-spoken', 'north-tongue', 9)],
      [ranks('language-spoken', 'north-tongue', 6), ranks('language-spoken', 'south-tongue', 4)],
      [ranks('language-spoken', 'a', 4), ranks('language-spoken', 'b', 3), ranks('language-spoken', 'c', 3)],
      [ranks('language-spoken', 'north-tongue', 5), ranks('language-spoken', 'north-tongue', 5)],
      [{ skillId: 'perception' as 'language-spoken', specialization: 'x', ranks: 10 }],
    ];
    for (const entries of invalid) {
      expect(await errorCode(() => validateMultilingualRanks(entries))).toBe('err-multilingual-distribution');
    }
  });
});

describe('Multilingual ranks on the sheet', () => {
  const setup = () => {
    const character = buildCharacter({ skills: [skill('language-spoken', 'north-tongue', 2, 'lore')], level: 1 });
    const catalog = {
      getSkillById: vi.fn((id: string) => Promise.resolve({ id, categoryId: 'lore', bonus: ['me'], specialization: 'language' })),
    };
    const service = new TalentSkillRanksService(
      catalog as never,
      { getSkillCategoryById: vi.fn().mockResolvedValue({ id: 'lore', bonus: ['re'] }) } as never,
      { getProfessionById: vi.fn().mockResolvedValue({ id: 'fighter', skillCosts: { lore: [1, 2] } }) },
      { getRaceById: vi.fn().mockResolvedValue({ id: 'race-001', skillBonuses: [] }) },
      { findById: vi.fn().mockResolvedValue({ id: 'game-001', realmId: 'realm-001' }) } as unknown as GameRepository,
      { check: vi.fn().mockResolvedValue(undefined) } as unknown as SpecializationCatalogService,
    );
    return { character, service };
  };

  it('creates the missing skills with the profession cost and grants the ranks at no cost', async () => {
    const { character, service } = setup();
    const granted = await service.prepare(character, 'multilingual', [
      ranks('language-spoken', 'North Tongue', 5),
      ranks('language-written', 'south-tongue', 5),
    ]);
    expect(granted).toEqual([
      { skillId: 'language-spoken', specialization: 'north-tongue', ranks: 5, created: false },
      { skillId: 'language-written', specialization: 'south-tongue', ranks: 5, created: true },
    ]);
    const written = character.findSkill('language-written', 'south-tongue')!;
    expect([written.development, written.statistics, written.categoryId]).toEqual([[1, 2], ['me', 're'], 'lore']);

    character.addTrait('multilingual', 'Multilingual', true, undefined, 10, undefined, undefined, granted);
    const spoken = character.findSkill('language-spoken', 'north-tongue')!;
    expect([spoken.ranks, spoken.talentRanks, spoken.ranksDeveloped]).toEqual([7, 5, 0]);
    expect([written.ranks, written.talentRanks, written.ranksDeveloped]).toEqual([5, 5, 0]);
    expect(character.experience.availableDevPoints).toBe(50);
    expect(character.traits[0].grantedRanks).toHaveLength(2);

    // The talent ranks are not developed ranks: a level down cannot take them
    expect(await errorCode(() => character.levelDownSkill('language-written', 'south-tongue'))).toBeDefined();

    character.deleteTrait('multilingual', undefined);
    expect([spoken.ranks, spoken.talentRanks]).toEqual([2, 0]);
    expect(character.findSkill('language-written', 'south-tongue')).toBeNull();
    expect(character.experience.availableDevPoints).toBe(60);
  });

  it('keeps a created skill that got developed ranks of its own after the talent', async () => {
    const { character, service } = setup();
    const granted = await service.prepare(character, 'multilingual', [ranks('language-written', 'south-tongue', 10)]);
    character.addTrait('multilingual', 'Multilingual', true, undefined, 10, undefined, undefined, granted);
    character.levelUpSkill('language-written', 'south-tongue', { bonusDevPointsPerLevel: 25, intenseTraining: false });
    character.deleteTrait('multilingual', undefined);
    expect(character.findSkill('language-written', 'south-tongue')).toMatchObject({ ranks: 1, talentRanks: 0, ranksDeveloped: 1 });
  });

  it('needs the languages for Multilingual and allows none for other talents', async () => {
    const { character, service } = setup();
    expect(await errorCode(() => service.prepare(character, 'multilingual', undefined))).toBe('err-multilingual-distribution');
    expect(await errorCode(() => service.prepare(character, 'quick-draw', [ranks('language-spoken', 'x', 10)]))).toBe(
      'err-multilingual-distribution',
    );
    expect(await service.prepare(character, 'quick-draw', undefined)).toEqual([]);
  });
});
