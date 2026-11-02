import { HerbRules, rollD10, type HerbSearchTarget } from '../../../../../src/modules/characters/domain/services/healing/herb-rules.js';
import { HealingCalculator } from '../../../../../src/modules/characters/domain/services/healing/healing-calculator.js';
import type { Injury } from '../../../../../src/modules/characters/domain/value-objects/injury.vo.js';
import { DomainError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { TABLES } from './healing.fixture.js';

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return (error as DomainError).code;
  }
  return undefined;
};

const effects = (overrides: Record<string, unknown> = {}) => ({
  heal: null,
  stunRelief: null,
  treats: null,
  recoveryBonus: null,
  ...overrides,
});

// Invented herbs (workspace spec 062)
const target = (itemTypeId: string, find: string, biomes: string[] = ['F'], highAltitude = false): HerbSearchTarget => ({
  itemTypeId,
  herb: { biomes: biomes as never, highAltitude, find },
});

describe('HerbRules (workspace spec 062, Treasure Law 2.3)', () => {
  it('heals with the range of a herb, and refuses one without a heal effect out of combat', () => {
    expect(HerbRules.healRange(effects({ heal: { min: 2, max: 6 } }))).toEqual({ min: 2, max: 6 });
    expect(codeOf(() => HerbRules.healRange(effects({ stunRelief: 3 })))).toBe('herb-without-effect');
    expect(codeOf(() => HerbRules.healRange(null))).toBe('herb-without-effect');
    expect(HerbRules.rollHeal({ min: 2, max: 6 }, () => 0)).toBe(2);
    expect(HerbRules.rollHeal({ min: 2, max: 6 }, () => 0.999)).toBe(6);
    expect(rollD10(() => 0)).toBe(1);
    expect(rollD10(() => 0.999)).toBe(10);
  });

  it('gives a treatment +25 to Medicine and +50 to the recovery roll (+75 with magic) when the herb treats the injury', () => {
    const bone = { magical: true, effects: effects({ treats: ['bone'] }) };
    expect(HerbRules.treatment(bone, 'bone', 'splint')).toEqual({ medicineBonus: 25, recoveryBonus: 50, treats: true });
    expect(HerbRules.treatment(bone, 'bone', 'magic')).toEqual({ medicineBonus: 25, recoveryBonus: 75, treats: true });
    const any = { magical: true, effects: effects({ treats: ['any'], recoveryBonus: 10 }) };
    expect(HerbRules.treatment(any, 'organ', 'herbs')).toEqual({ medicineBonus: 25, recoveryBonus: 60, treats: true });
    expect(codeOf(() => HerbRules.treatment(bone, 'organ', 'splint'))).toBe('herb-not-applicable');
    expect(codeOf(() => HerbRules.treatment({ magical: true, effects: null }, 'bone', 'splint'))).toBe('herb-not-applicable');
    // A mundane herb: +25 to Medicine only
    expect(HerbRules.treatment({ magical: false, effects: null }, 'bone', 'splint')).toEqual({
      medicineBonus: 25,
      recoveryBonus: 0,
      treats: false,
    });
  });

  it('adds the find difficulty, -10 per previous search and the several herbs penalty to each maneuver', () => {
    expect(HerbRules.findModifier('h')).toBe(-10);
    expect(HerbRules.findModifier('n')).toBe(-100);
    expect(HerbRules.findModifier('vh')).toBe(-20);
    expect(HerbRules.findModifier('unknown')).toBe(0);
    expect(HerbRules.severalHerbsPenalty(1, 0)).toBe(0);
    expect([0, 1].map(index => HerbRules.severalHerbsPenalty(2, index))).toEqual([-4, -8]);
    expect([0, 1, 2].map(index => HerbRules.severalHerbsPenalty(3, index))).toEqual([-6, -12, -18]);

    const maneuvers = HerbRules.maneuvers([target('a', 'm'), target('b', 'e'), target('c', 'h', ['D'])], {
      biome: 'F',
      highAltitude: false,
      base: 120,
      previousSearches: 2,
    });
    expect(maneuvers).toEqual([
      {
        itemTypeId: 'a',
        here: true,
        difficulty: 'm',
        modifiers: [
          { key: 'previous-searches', value: -20 },
          { key: 'several-herbs', value: -6 },
        ],
        total: 94,
      },
      {
        itemTypeId: 'b',
        here: true,
        difficulty: 'e',
        modifiers: [
          { key: 'difficulty', value: 20 },
          { key: 'previous-searches', value: -20 },
          { key: 'several-herbs', value: -12 },
        ],
        total: 108,
      },
      { itemTypeId: 'c', here: false, difficulty: 'h', modifiers: [], total: 0 },
    ]);
  });

  it('finds a herb only in its biomes and altitude', () => {
    expect(HerbRules.grows({ biomes: ['F', 'D'], highAltitude: false }, 'D', false)).toBe(true);
    expect(HerbRules.grows({ biomes: ['F'], highAltitude: false }, 'D', false)).toBe(false);
    expect(HerbRules.grows({ biomes: ['A'], highAltitude: true }, 'A', false)).toBe(false);
    expect(HerbRules.grows({ biomes: ['A'], highAltitude: true }, 'A', true)).toBe(true);
  });

  it('reads the result and the doses: 1d10, +1 per full 10 over 100', () => {
    expect(HerbRules.result('absolute-success')).toBe('found');
    expect(HerbRules.result('success')).toBe('found');
    expect(HerbRules.result('partial-success')).toBe('not-found');
    expect(HerbRules.result('failure')).toBe('not-found');
    expect(HerbRules.result('absolute-failure')).toBe('absolute-failure');
    expect(HerbRules.doses(100, 4)).toBe(4);
    expect(HerbRules.doses(109, 4)).toBe(4);
    expect(HerbRules.doses(110, 4)).toBe(5);
    expect(HerbRules.doses(135, 4)).toBe(7);
    expect(HerbRules.doses(80, 4)).toBe(4);
    expect(HerbRules.hours(false)).toBe(10);
    expect(HerbRules.hours(true)).toBe(5);
  });

  it('adds the herb bonus of the latest treatment to the recovery roll', () => {
    const injury = {
      type: 'bone',
      severity: 'medium',
      penalty: -20,
      treatments: [
        {
          id: 't1',
          procedure: 'splint',
          healer: { name: 'H', bonus: 0 },
          difficulty: 0,
          roll: 50,
          total: 105,
          result: 'success',
          healingType: 'magic-or-herbs',
          recoveryModifier: 0,
          at: '2026-10-31T00:00:00.000Z',
          context: 'strategic',
          herb: { itemId: 'i', itemTypeId: 'moss', name: 'Moss', magical: true, medicineBonus: 25, recoveryBonus: 50 },
        },
      ],
    } as unknown as Injury;
    const withHerb = new HealingCalculator(TABLES).recoveryModifiers({ bodyDevelopmentRanks: 2, constitutionBonus: 3 }, injury);
    const without = new HealingCalculator(TABLES).recoveryModifiers(
      { bodyDevelopmentRanks: 2, constitutionBonus: 3 },
      { ...injury, treatments: [{ ...injury.treatments[0], herb: undefined }] },
    );
    expect(withHerb.total - without.total).toBe(50);
    expect(withHerb.breakdown).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'herb', value: 50 })]));
  });
});
