import {
  getStatGainRollRange,
  validateCreationStats,
  validateStatPoints,
} from '../../../../../src/modules/characters/domain/services/stats/stat-rules';
import { STAT_KEYS, StatKey } from '../../../../../src/modules/characters/domain/value-objects/character-stat.vo';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors';
import { buildCharacter } from '../traits/character.fixture';

const errorCode = (fn: () => void): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as ValidationError).errorCode;
  }
  return undefined;
};

const stats = (temporary: number, potential = 100, overrides: Partial<Record<StatKey, { potential: number; temporary: number }>> = {}) =>
  Object.fromEntries(STAT_KEYS.map(k => [k, overrides[k] ?? { potential, temporary }])) as Record<
    StatKey,
    { potential: number; temporary: number }
  >;

describe('Stat gain rolls', () => {
  it('uses the die bands of the stat level up dialog', () => {
    expect(getStatGainRollRange(5)).toEqual({ min: 0, max: 2 });
    expect(getStatGainRollRange(8)).toEqual({ min: 1, max: 3 });
    expect(getStatGainRollRange(18)).toEqual({ min: 1, max: 6 });
    expect(getStatGainRollRange(50)).toEqual({ min: 1, max: 10 });
    expect(getStatGainRollRange(90)).toEqual({ min: 1, max: 6 });
    expect(getStatGainRollRange(92)).toEqual({ min: 1, max: 3 });
    expect(getStatGainRollRange(95)).toEqual({ min: 0, max: 2 });
  });

  it('rejects a roll outside the die of the current temporary value', () => {
    const character = buildCharacter({ level: 2 });
    character.experience.availableStatLevelUp = 2;
    character.statistics.ag.temporary = 90;
    expect(errorCode(() => character.updateTemporaryStat('ag', 7))).toBe('err-stat-gain-roll-out-of-range');
    expect(errorCode(() => character.updateTemporaryStat('ag', 0))).toBe('err-stat-gain-roll-out-of-range');
    expect(character.experience.availableStatLevelUp).toBe(2);
    expect(character.statistics.ag.temporary).toBe(90);
  });

  it('uses the free stat gains first', () => {
    const character = buildCharacter({ level: 2, devPoints: 10 });
    character.experience.availableStatLevelUp = 1;
    character.statistics.ag.potential = 70;
    character.updateTemporaryStat('ag', 3);
    expect([character.statistics.ag.temporary, character.experience.availableStatLevelUp]).toEqual([53, 0]);
    expect(character.experience.availableDevPoints).toBe(10);
  });

  it('acceptance 8: the extra stat gain roll costs 4 development points', () => {
    const character = buildCharacter({ level: 2, devPoints: 10 });
    character.experience.availableStatLevelUp = 0;
    character.updateTemporaryStat('ag', 3);
    expect(character.experience.availableDevPoints).toBe(6);
    expect(character.experience.developedStatLevelUp).toBe(1);
  });

  it('pays the extra roll with bonus points when the normal ones are not enough', () => {
    const character = buildCharacter({ level: 2, devPoints: 1, bonusDevPoints: 10 });
    character.experience.availableStatLevelUp = 0;
    character.updateTemporaryStat('ag', 3, { bonusDevPointsPerLevel: 25 });
    expect([character.experience.availableDevPoints, character.experience.availableBonusDevPoints]).toEqual([0, 7]);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(3);
  });

  it('rejects the extra roll without points', () => {
    const character = buildCharacter({ level: 2, devPoints: 3 });
    character.experience.availableStatLevelUp = 0;
    expect(() => character.updateTemporaryStat('ag', 3)).toThrow(ValidationError);
    expect(character.statistics.ag.temporary).toBe(50);
  });
});

describe('Stats at creation', () => {
  it('accepts valid stats', () => {
    expect(() => validateCreationStats(stats(50, 70), STAT_KEYS)).not.toThrow();
  });

  it('rejects a temporary value above the potential', () => {
    expect(errorCode(() => validateCreationStats(stats(50, 70, { st: { potential: 60, temporary: 61 } }), STAT_KEYS))).toBe(
      'err-stat-temporary-above-potential',
    );
  });

  it('rejects values outside 1..100 and missing stats', () => {
    expect(errorCode(() => validateCreationStats(stats(0, 70), STAT_KEYS))).toBe('err-stat-out-of-range');
    expect(errorCode(() => validateCreationStats(stats(50, 101), STAT_KEYS))).toBe('err-stat-out-of-range');
    const missing = stats(50, 70) as Partial<Record<StatKey, { potential: number; temporary: number }>>;
    delete missing.ag;
    expect(errorCode(() => validateCreationStats(missing, STAT_KEYS))).toBe('err-stat-out-of-range');
  });

  it('point-buy: rejects stat bonuses above the budget', () => {
    // 60 gives +2 in the bonus table: 10 stats x 2 = 20
    expect(errorCode(() => validateStatPoints(stats(60), STAT_KEYS, 15))).toBe('err-stat-points-exceeded');
    expect(() => validateStatPoints(stats(60), STAT_KEYS, 20)).not.toThrow();
    // Negative bonuses give points back
    expect(() =>
      validateStatPoints(stats(60, 100, { ag: { potential: 50, temporary: 30 }, co: { potential: 50, temporary: 30 } }), STAT_KEYS, 10),
    ).not.toThrow();
  });
});
