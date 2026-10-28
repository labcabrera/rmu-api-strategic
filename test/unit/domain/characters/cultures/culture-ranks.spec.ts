import { allowAllCharacterAccess } from '../../../support/allow-all-access.js';
import { fakeEventPublisher } from '../../../support/fake-event-publisher.js';
import { CreateCharacterHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/create-character.handler.js';
import {
  CharacterStatCreation,
  CreateCharacterCommand,
  type CreateCharacterCulture,
  CreateCharacterInfo,
} from '../../../../../src/modules/characters/application/cqrs/commands/create-character.command.js';
import {
  type CultureAssignment,
  resolveCultureRanks,
} from '../../../../../src/modules/characters/application/services/culture-ranks.resolver.js';
import type { Culture } from '../../../../../src/modules/characters/application/ports/culture-client.port.js';
import type { SkillResponse } from '../../../../../src/modules/characters/application/ports/skill-client.port.js';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { STAT_KEYS, type StatKey } from '../../../../../src/modules/characters/domain/value-objects/character-stat.vo.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { UpstreamBadGatewayError } from '../../../../../src/modules/shared/infrastructure/http/http-client.js';

// Invented catalog and culture: not book data
const catalog: SkillResponse[] = [
  { id: 'perception', categoryId: 'awareness', bonus: ['in'], specialization: undefined },
  { id: 'melee-weapon', categoryId: 'combat', bonus: ['st'], specialization: 'weapon' },
  { id: 'unarmed-st', categoryId: 'combat', bonus: ['st'], specialization: 'unarmed-melee-attack' },
  { id: 'carving', categoryId: 'crafting', bonus: ['ag'], specialization: undefined },
  { id: 'trading', categoryId: 'vocation', bonus: ['me'], specialization: undefined },
  { id: 'jumping', categoryId: 'athletic', bonus: ['ag'], specialization: undefined },
  { id: 'language-spoken', categoryId: 'lore', bonus: ['me'], specialization: 'language' },
  { id: 'language-written', categoryId: 'lore', bonus: ['me'], specialization: 'language' },
  { id: 'region-lore', categoryId: 'lore', bonus: ['me'], specialization: 'region' },
  { id: 'body-development', categoryId: 'physical', bonus: ['co'], specialization: undefined },
];

const culture: Culture = {
  id: 'culture-test',
  name: 'Test culture',
  languages: ['north-tongue', 'south-tongue'],
  skillRanks: [
    { type: 'skill', skillId: 'perception', ranks: 2 },
    { type: 'skill-choice', skillIds: ['melee-weapon', 'unarmed-st'], ranks: 3 },
    { type: 'category-pool', categoryIds: ['crafting', 'vocation'], ranks: 3 },
    { type: 'languages', ranks: 5 },
    { type: 'region', skillId: 'region-lore', region: 'own', ranks: 1 },
  ],
};

const validAssignments: CultureAssignment[] = [
  { entry: 1, skillId: 'melee-weapon', specialization: 'sword', ranks: 2 },
  { entry: 1, skillId: 'unarmed-st', specialization: 'strikes', ranks: 1 },
  { entry: 2, skillId: 'carving', ranks: 2 },
  { entry: 2, skillId: 'trading', ranks: 1 },
  { entry: 3, skillId: 'language-spoken', specialization: 'north-tongue', ranks: 4 },
  { entry: 3, skillId: 'language-written', specialization: 'north-tongue', ranks: 1 },
  { entry: 4, skillId: 'region-lore', specialization: 'home valley', ranks: 1 },
];

const replace = (index: number, assignment: Partial<CultureAssignment>): CultureAssignment[] =>
  validAssignments.map((a, i) => (i === index ? { ...a, ...assignment } : a));

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as ValidationError).code;
  }
  return undefined;
};

describe('resolveCultureRanks', () => {
  it('applies the fixed entries and the assignments', () => {
    const ranks = resolveCultureRanks(culture, validAssignments, catalog);
    expect(ranks).toEqual([
      { skillId: 'perception', specialization: null, ranks: 2 },
      { skillId: 'melee-weapon', specialization: 'sword', ranks: 2 },
      { skillId: 'unarmed-st', specialization: 'strikes', ranks: 1 },
      { skillId: 'carving', specialization: null, ranks: 2 },
      { skillId: 'trading', specialization: null, ranks: 1 },
      { skillId: 'language-spoken', specialization: 'north-tongue', ranks: 4 },
      { skillId: 'language-written', specialization: 'north-tongue', ranks: 1 },
      { skillId: 'region-lore', specialization: 'home valley', ranks: 1 },
    ]);
  });

  it('rejects an entry with fewer or more ranks than it gives', () => {
    expect(errorCode(() => resolveCultureRanks(culture, validAssignments.slice(1), catalog))).toBe('err-culture-incomplete-entry');
    expect(errorCode(() => resolveCultureRanks(culture, replace(3, { ranks: 2 }), catalog))).toBe('err-culture-incomplete-entry');
    expect(errorCode(() => resolveCultureRanks(culture, validAssignments.slice(0, 6), catalog))).toBe('err-culture-incomplete-entry');
  });

  it('rejects a skill that does not belong to the entry', () => {
    expect(errorCode(() => resolveCultureRanks(culture, replace(2, { skillId: 'jumping' }), catalog))).toBe('err-culture-wrong-skill');
    expect(errorCode(() => resolveCultureRanks(culture, replace(0, { skillId: 'carving', specialization: null }), catalog))).toBe(
      'err-culture-wrong-skill',
    );
    expect(errorCode(() => resolveCultureRanks(culture, replace(4, { skillId: 'trading' }), catalog))).toBe('err-culture-wrong-skill');
    expect(errorCode(() => resolveCultureRanks(culture, replace(6, { skillId: 'language-spoken' }), catalog))).toBe(
      'err-culture-wrong-skill',
    );
    expect(errorCode(() => resolveCultureRanks(culture, replace(2, { skillId: 'unknown' }), catalog))).toBe('err-culture-wrong-skill');
  });

  it('rejects more ranks per skill than the entry allows (2 by default in pools and choices)', () => {
    const pool = [...validAssignments.filter(a => a.entry !== 2), { entry: 2, skillId: 'carving', ranks: 3 }];
    expect(errorCode(() => resolveCultureRanks(culture, pool, catalog))).toBe('err-culture-max-ranks-per-skill');
    const choice = [
      ...validAssignments.filter(a => a.entry !== 1),
      { entry: 1, skillId: 'melee-weapon', specialization: 'sword', ranks: 2 },
      { entry: 1, skillId: 'melee-weapon', specialization: 'sword', ranks: 1 },
    ];
    expect(errorCode(() => resolveCultureRanks(culture, choice, catalog))).toBe('err-culture-max-ranks-per-skill');
  });

  it('does not limit the ranks per skill of languages', () => {
    const languages = [
      ...validAssignments.filter(a => a.entry !== 3),
      { entry: 3, skillId: 'language-spoken', specialization: 'south-tongue', ranks: 5 },
    ];
    expect(() => resolveCultureRanks(culture, languages, catalog)).not.toThrow();
  });

  it('requires the specialization when the skill needs one', () => {
    expect(errorCode(() => resolveCultureRanks(culture, replace(0, { specialization: null }), catalog))).toBe(
      'err-culture-missing-specialization',
    );
    expect(errorCode(() => resolveCultureRanks(culture, replace(4, { specialization: ' ' }), catalog))).toBe(
      'err-culture-missing-specialization',
    );
    expect(errorCode(() => resolveCultureRanks(culture, replace(6, { specialization: undefined }), catalog))).toBe(
      'err-culture-missing-specialization',
    );
  });

  it('rejects a language the culture does not offer and accepts any language when there is no list', () => {
    const other = replace(4, { specialization: 'far-tongue' });
    expect(errorCode(() => resolveCultureRanks(culture, other, catalog))).toBe('err-culture-language-not-offered');
    expect(() => resolveCultureRanks({ ...culture, languages: [] }, other, catalog)).not.toThrow();
  });

  it('rejects assignments to fixed or missing entries', () => {
    expect(
      errorCode(() => resolveCultureRanks(culture, [...validAssignments, { entry: 0, skillId: 'perception', ranks: 1 }], catalog)),
    ).toBe('err-culture-invalid-entry');
    expect(
      errorCode(() => resolveCultureRanks(culture, [...validAssignments, { entry: 9, skillId: 'perception', ranks: 1 }], catalog)),
    ).toBe('err-culture-invalid-entry');
  });

  it('adds up the same language assigned from two entries', () => {
    const twoEntries: Culture = {
      ...culture,
      skillRanks: [
        { type: 'languages', ranks: 2 },
        { type: 'skill-choice', skillIds: ['language-spoken'], ranks: 1 },
      ],
    };
    const ranks = resolveCultureRanks(
      twoEntries,
      [
        { entry: 0, skillId: 'language-spoken', specialization: 'north-tongue', ranks: 2 },
        { entry: 1, skillId: 'language-spoken', specialization: 'north-tongue', ranks: 1 },
      ],
      catalog,
    );
    expect(ranks).toEqual([{ skillId: 'language-spoken', specialization: 'north-tongue', ranks: 3 }]);
  });
});

describe('CreateCharacterHandler', () => {
  const statistics = (temporary = 50, potential = 70) =>
    Object.fromEntries(STAT_KEYS.map(k => [k, new CharacterStatCreation(potential, temporary)])) as Record<StatKey, CharacterStatCreation>;

  const setup = (game: { powerLevel?: Record<string, number>; options?: Record<string, unknown> } = {}, baseDevPoints = 50) => {
    const save = vi.fn((c: Character) => Promise.resolve(c));
    const cultureClient = { getCultureById: vi.fn().mockResolvedValue(culture) };
    const handler = new CreateCharacterHandler(
      { save } as never,
      {
        findById: vi.fn().mockResolvedValue({
          id: 'game-001',
          powerLevel: { baseDevPoints: 60, ...(game.powerLevel || {}) },
          options: game.options || {},
        }),
      } as never,
      { findById: vi.fn().mockResolvedValue({ id: 'faction-001', name: 'Faction', gameId: 'game-001' }) } as never,
      {
        getRaceById: vi.fn().mockResolvedValue({
          id: 'race-001',
          name: 'Race',
          sizeId: 'medium',
          baseHits: 20,
          baseDevPoints,
          traits: [],
          skillBonuses: [],
        }),
      },
      { getAllSkills: vi.fn().mockResolvedValue({ content: catalog }), getSkillById: vi.fn() },
      {
        getAllSkillCategories: vi
          .fn()
          .mockResolvedValue(
            ['awareness', 'combat', 'crafting', 'vocation', 'athletic', 'lore', 'physical'].map(id => ({ id, bonus: [] })),
          ),
      } as never,
      {
        getProfessionById: vi.fn().mockResolvedValue({
          id: 'fighter',
          professionalSkills: [],
          skillCosts: {
            awareness: [2, 4],
            combat1: [2, 5],
            combat4: [4, 8],
            crafting: [3, 6],
            vocation: [3, 6],
            lore: [1, 2],
            physical: [2, 6],
          },
        }),
      },
      { getTraitById: vi.fn() },
      cultureClient,
      fakeEventPublisher().publisher,
      { process: vi.fn() } as unknown as CharacterProcessorService,
      allowAllCharacterAccess,
      { resolve: (skillId: string) => Promise.resolve(skillId) } as never,
    );
    const create = (cultureChoice?: CreateCharacterCulture, stats = statistics()) =>
      handler.execute(
        new CreateCharacterCommand(
          'game-001',
          'faction-001',
          'Test',
          new CreateCharacterInfo('race-001', 'fighter', 'medium', ['essence'], 1.8, 80),
          { gender: undefined, age: undefined },
          5,
          ['melee', 'ranged', 'shield', 'unarmed'],
          stats,
          [{ skillId: 'jumping', specialization: null }],
          undefined,
          'user-001',
          [],
          cultureChoice,
        ),
      );
    return { create, cultureClient };
  };

  it('acceptance 3: applies the culture ranks before level 1 without spending points', async () => {
    const { create } = setup();
    const character = await create({ cultureId: 'culture-test', assignments: validAssignments });
    expect(character.info.cultureId).toBe('culture-test');
    expect(character.experience.level).toBe(0);
    expect(character.experience.availableDevPoints).toBe(0);
    const ranks = (skillId: string, specialization: string | null = null) => {
      const s = character.findSkill(skillId, specialization)!;
      return [s.ranks, s.cultureRanks, s.ranksDeveloped];
    };
    expect(ranks('perception')).toEqual([2, 2, 0]);
    expect(ranks('melee-weapon', 'sword')).toEqual([2, 2, 0]);
    expect(ranks('language-spoken', 'north-tongue')).toEqual([4, 4, 0]);
    expect(ranks('region-lore', 'home valley')).toEqual([1, 1, 0]);
    expect(ranks('jumping')).toEqual([0, 0, 0]);
    // Skills created for the culture take the profession cost
    expect(character.findSkill('melee-weapon', 'sword')!.development).toEqual([2, 5]);
    expect(character.findSkill('unarmed-st', 'strikes')!.development).toEqual([4, 8]);
    expect(character.findSkill('carving', null)!.development).toEqual([3, 6]);
  });

  it('acceptance 3: rejects an incomplete assignment or one above the maximum per skill', async () => {
    const { create } = setup();
    await expect(create({ cultureId: 'culture-test', assignments: validAssignments.slice(1) })).rejects.toMatchObject({
      code: 'err-culture-incomplete-entry',
    });
    const tooMany = [...validAssignments.filter(a => a.entry !== 2), { entry: 2, skillId: 'carving', ranks: 3 }];
    await expect(create({ cultureId: 'culture-test', assignments: tooMany })).rejects.toMatchObject({
      code: 'err-culture-max-ranks-per-skill',
    });
  });

  it('reports a culture core answers 404 for with err-culture-not-found', async () => {
    const { create, cultureClient } = setup();
    cultureClient.getCultureById.mockRejectedValue(new UpstreamBadGatewayError('core/cultures/missing answered 404', 404));
    await expect(create({ cultureId: 'missing', assignments: [] })).rejects.toMatchObject({ code: 'err-culture-not-found' });
  });

  // F-strategic-26, spec 044 decision 5: a failure of core is not the user's mistake
  it('propagates any other failure of core', async () => {
    const { create, cultureClient } = setup();
    const down = new UpstreamBadGatewayError('core/cultures/culture-test answered 500', 500);
    cultureClient.getCultureById.mockRejectedValue(down);
    await expect(create({ cultureId: 'culture-test', assignments: [] })).rejects.toBe(down);
  });

  it('acceptance 4: without culture the character is created as before but without the level 0 points', async () => {
    const { create, cultureClient } = setup();
    const character = await create();
    expect(cultureClient.getCultureById).not.toHaveBeenCalled();
    expect(character.info.cultureId).toBeNull();
    expect(character.experience).toMatchObject({ level: 0, devPoints: 60, availableDevPoints: 0 });
    expect(character.skills.every(s => s.ranks === 0 && s.cultureRanks === 0)).toBe(true);
    character.levelUp(false);
    expect(character.experience.availableDevPoints).toBe(60);
  });

  it('acceptance 5: the bonus pool is the race points plus the game master creation bonus', async () => {
    expect((await setup({}, 50).create()).experience.availableBonusDevPoints).toBe(50);
    expect((await setup({ powerLevel: { creationBonusDevPoints: 10 } }, 50).create()).experience.availableBonusDevPoints).toBe(60);
  });

  it('validates the stats at creation', async () => {
    const { create } = setup();
    await expect(create(undefined, statistics(80, 70))).rejects.toMatchObject({ code: 'err-stat-temporary-above-potential' });
    await expect(create(undefined, statistics(0, 70))).rejects.toMatchObject({ code: 'err-stat-out-of-range' });
  });

  it('validates the stat points budget with point-buy generation', async () => {
    const pointBuy = setup({ options: { statGeneration: 'point-buy' }, powerLevel: { statPoints: 15 } });
    // 60 gives +2 in the bonus table: 10 stats x 2 = 20
    await expect(pointBuy.create(undefined, statistics(60, 80))).rejects.toMatchObject({ code: 'err-stat-points-exceeded' });
    await expect(pointBuy.create(undefined, statistics(50, 80))).resolves.toBeDefined();
    await expect(setup().create(undefined, statistics(60, 80))).resolves.toBeDefined();
  });
});
