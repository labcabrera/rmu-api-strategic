import { buildCharacter, skill } from '../traits/character.fixture.js';
import type { CharacterSkill } from '../../../../../src/modules/characters/domain/value-objects/character-skill.vo.js';
import { DevPointsSpendingService } from '../../../../../src/modules/characters/domain/services/dev-points/dev-points-spending.service.js';

// Workspace spec 076, block A: creation as a single level (A2), pools (A3), stat gain payments (A4), saving points (A5)
const rules = { bonusDevPointsPerLevel: 25, intenseTraining: false };

const errorOf = (fn: () => void): { code?: string; details?: unknown } | undefined => {
  try {
    fn();
  } catch (e) {
    return e as { code?: string; details?: unknown };
  }
  return undefined;
};

const withCost = (s: CharacterSkill, development: number[]): CharacterSkill => {
  (s as { development: number[] }).development = development;
  return s;
};

describe('Creation as a single development level (A2)', () => {
  it('keeps the ranks developed at level 0: a third rank at level 1 fails', () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 0, devPoints: 0, bonusDevPoints: 25 });
    character.levelUpSkill('perception', null, rules);
    character.levelUpSkill('perception', null, rules);
    character.levelUp(false);
    expect([character.experience.level, perception.ranksDeveloped]).toEqual([1, 2]);
    expect(perception.devPointsSpent).toEqual({ normal: 0, bonus: 6 });
    expect(errorOf(() => character.levelUpSkill('perception', null, rules))?.code).toBe('err-skill-max-ranks-per-level');
  });

  it('keeps the bonus points spent at level 0: 20 spent leave 5 for level 1', () => {
    const skills = ['a', 'b'].map(id => withCost(skill(id), [10, 10]));
    const character = buildCharacter({ skills, level: 0, devPoints: 0, bonusDevPoints: 50 });
    character.levelUpSkill('a', null, rules);
    character.levelUpSkill('a', null, rules);
    character.levelUp(false);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(20);
    expect(DevPointsSpendingService.availableBonus(character.experience, rules)).toBe(5);
    expect(character.experience.availableDevPoints).toBe(60);
  });

  it('starts counting again from level 1 to level 2', () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 1, bonusDevPoints: 25 });
    character.levelUpSkill('perception', null, { ...rules, pool: 'bonus' });
    character.levelUp(true);
    expect([perception.ranksDeveloped, character.experience.bonusDevPointsSpentThisLevel]).toEqual([0, 0]);
  });
});

describe('Pool choice (A3)', () => {
  it("'auto' spends normal points first", () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 1, devPoints: 10, bonusDevPoints: 10 });
    character.levelUpSkill('perception', null, { ...rules, pool: 'auto' });
    expect(perception.devPointsSpent).toEqual({ normal: 2, bonus: 0 });
  });

  it("'bonus' spends bonus points first, up to the per level limit, and then normal points", () => {
    const climbing = withCost(skill('climbing'), [6, 6]);
    const character = buildCharacter({ skills: [climbing], level: 1, devPoints: 10, bonusDevPoints: 30 });
    character.experience.bonusDevPointsSpentThisLevel = 21;
    character.levelUpSkill('climbing', null, { ...rules, pool: 'bonus' });
    expect(climbing.devPointsSpent).toEqual({ normal: 2, bonus: 4 });
    expect([character.experience.availableDevPoints, character.experience.bonusDevPointsSpentThisLevel]).toEqual([8, 25]);
  });

  it("'normal' only spends normal points and fails with err-dev-points-insufficient", () => {
    const climbing = withCost(skill('climbing'), [6, 6]);
    const character = buildCharacter({ skills: [climbing], level: 1, devPoints: 5, bonusDevPoints: 30 });
    expect(errorOf(() => character.levelUpSkill('climbing', null, { ...rules, pool: 'normal' }))?.code).toBe('err-dev-points-insufficient');
    expect([character.experience.availableDevPoints, character.experience.availableBonusDevPoints, climbing.ranks]).toEqual([5, 30, 0]);
  });
});

describe('Stat gain payments (A4)', () => {
  it('records the pools of each extra roll and keeps those of the last two levels', () => {
    const character = buildCharacter({ level: 2, devPoints: 2, bonusDevPoints: 10 });
    character.experience.availableStatLevelUp = 0;
    character.updateTemporaryStat('ag', 1, { bonusDevPointsPerLevel: 25 });
    character.updateTemporaryStat('st', 1, { bonusDevPointsPerLevel: 25, pool: 'bonus' });
    expect(character.experience.statGainPayments).toEqual([
      { stat: 'ag', normal: 2, bonus: 2, level: 2 },
      { stat: 'st', normal: 0, bonus: 4, level: 2 },
    ]);
    character.experience.availableStatLevelUp = 0;
    character.levelUp(true);
    expect(character.experience.statGainPayments).toHaveLength(2);
    character.levelUp(true);
    expect(character.experience.statGainPayments).toEqual([]);
  });

  it('records nothing for a free stat gain', () => {
    const character = buildCharacter({ level: 2 });
    character.experience.availableStatLevelUp = 1;
    character.updateTemporaryStat('ag', 1);
    expect(character.experience.statGainPayments).toEqual([]);
  });
});

describe('Saving development points (A5)', () => {
  it('fails with err-level-up-unspent-dev-points and the unspent points', () => {
    const character = buildCharacter({ level: 1, devPoints: 7 });
    expect(errorOf(() => character.levelUp(false))).toMatchObject({ code: 'err-level-up-unspent-dev-points', details: { unspent: 7 } });
  });

  it('saves the unspent normal points for the next level with the game option', () => {
    const character = buildCharacter({ level: 1, devPoints: 7, bonusDevPoints: 10 });
    character.levelUp(false, { save: true, allowSavingDevPoints: true });
    expect(character.experience.level).toBe(2);
    expect([character.experience.availableDevPoints, character.experience.savedDevPoints]).toEqual([67, 7]);
    // Saved points are normal points: the bonus points limit starts at 0
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(0);
    expect(character.experience.availableBonusDevPoints).toBe(10);
    character.experience.availableDevPoints = 0;
    character.levelUp(false);
    expect([character.experience.availableDevPoints, character.experience.savedDevPoints]).toEqual([60, 0]);
  });

  it('fails with err-dev-points-saving-not-allowed without the game option', () => {
    const character = buildCharacter({ level: 1, devPoints: 7 });
    expect(errorOf(() => character.levelUp(false, { save: true }))?.code).toBe('err-dev-points-saving-not-allowed');
    expect(character.experience.level).toBe(1);
  });

  it('still loses the points with force', () => {
    const character = buildCharacter({ level: 1, devPoints: 7 });
    character.levelUp(true, { allowSavingDevPoints: true });
    expect([character.experience.availableDevPoints, character.experience.savedDevPoints]).toEqual([60, 0]);
  });
});
