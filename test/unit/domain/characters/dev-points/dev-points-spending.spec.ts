import { DevPointsSpendingService } from '../../../../../src/modules/characters/domain/services/dev-points/dev-points-spending.service';
import { CharacterXP } from '../../../../../src/modules/characters/domain/value-objects/character-xp.vo';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors';
import { buildCharacter, skill } from '../traits/character.fixture';

const xp = (normal: number, bonus: number, spentThisLevel = 0, flaw = 0): CharacterXP => {
  const result = CharacterXP.fromLevel(1, ['melee', 'ranged', 'shield', 'unarmed']);
  result.availableDevPoints = normal;
  result.availableBonusDevPoints = bonus;
  result.bonusDevPointsSpentThisLevel = spentThisLevel;
  result.flawDevPoints = flaw;
  return result;
};

const rules = { bonusDevPointsPerLevel: 25 };

describe('DevPointsSpendingService', () => {
  it('spends normal points first', () => {
    const e = xp(10, 50);
    const payment = DevPointsSpendingService.spend(e, 6, rules);
    expect(payment).toMatchObject({ normal: 6, bonus: 0 });
    expect([e.availableDevPoints, e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([4, 50, 0]);
  });

  it('takes bonus points when the normal ones are not enough and tracks the per level spending', () => {
    const e = xp(4, 50);
    const payment = DevPointsSpendingService.spend(e, 10, rules);
    expect(payment).toEqual({ normal: 4, bonus: 6, flaw: 0, cappedBonus: 6 });
    expect([e.availableDevPoints, e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([0, 44, 6]);
  });

  it('limits the bonus points to raceDevPointsPerLevel minus the points spent this level', () => {
    const e = xp(0, 50, 20);
    expect(DevPointsSpendingService.availableBonus(e, rules)).toBe(5);
    expect(() => DevPointsSpendingService.spend(e, 6, rules)).toThrow(ValidationError);
    expect([e.availableDevPoints, e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([0, 50, 20]);
  });

  it('does not limit nor count the bonus points when the cap is disabled', () => {
    const e = xp(0, 50, 25);
    const payment = DevPointsSpendingService.spend(e, 40, { ...rules, capBonus: false });
    expect(payment).toEqual({ normal: 0, bonus: 40, flaw: 0, cappedBonus: 0 });
    expect([e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([10, 25]);
  });

  it('draws only from the requested pools', () => {
    const e = xp(30, 30, 0, 8);
    expect(DevPointsSpendingService.spend(e, 8, { ...rules, pools: ['flaw'] })).toMatchObject({ normal: 0, bonus: 0, flaw: 8 });
    expect(() => DevPointsSpendingService.spend(e, 1, { ...rules, pools: ['flaw'] })).toThrow(ValidationError);
  });

  it('refunds each pool and releases the per level limit', () => {
    const e = xp(0, 44, 6);
    DevPointsSpendingService.refund(e, { normal: 4, bonus: 6, flaw: 0, cappedBonus: 6 }, true);
    expect([e.availableDevPoints, e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([4, 50, 0]);
  });

  it('keeps the per level spending when refunding a payment of a previous level', () => {
    const e = xp(0, 44, 3);
    DevPointsSpendingService.refund(e, { normal: 0, bonus: 6, flaw: 0, cappedBonus: 6 }, false);
    expect([e.availableBonusDevPoints, e.bonusDevPointsSpentThisLevel]).toEqual([50, 3]);
  });

  it('cannot undo a flaw whose points were already spent', () => {
    const e = xp(2, 0);
    expect(() => DevPointsSpendingService.refund(e, { normal: -8, bonus: 0, flaw: 0, cappedBonus: 0 }, true)).toThrow(ValidationError);
    expect(e.availableDevPoints).toBe(2);
  });
});

describe('Character development points across levels', () => {
  const skillRules = { bonusDevPointsPerLevel: 25, allowThirdRank: false };

  const spendAll = (character: ReturnType<typeof buildCharacter>, skillIds: string[]) => {
    skillIds.forEach(id => {
      character.levelUpSkill(id, null, skillRules);
      character.levelUpSkill(id, null, skillRules);
    });
  };

  it('acceptance 5: a 50 bonus point race with a limit of 25 spends 60 + 25 at level 1 and 60 + 25 at level 2', () => {
    // 17 skills costing 5 + 5 per level: enough to exhaust the points
    const ids = Array.from({ length: 17 }, (_, i) => `skill-${i}`);
    const skills = ids.map(id => {
      const s = skill(id);
      (s as { development: number[] }).development = [5, 5];
      return s;
    });
    const character = buildCharacter({ skills, devPoints: 0, bonusDevPoints: 50 });
    character.levelUp(false);
    expect(character.experience.level).toBe(1);
    expect(character.experience.availableDevPoints).toBe(60);

    spendAll(character, ids.slice(0, 8)); // 80
    character.levelUpSkill('skill-8', null, skillRules); // 85
    expect(character.experience.availableDevPoints).toBe(0);
    expect(character.experience.availableBonusDevPoints).toBe(25);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(25);
    expect(() => character.levelUpSkill('skill-8', null, skillRules)).toThrow(ValidationError);

    character.levelUp(false);
    expect(character.experience.availableDevPoints).toBe(60);
    expect(character.experience.availableBonusDevPoints).toBe(25);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(0);
    spendAll(character, ids.slice(0, 8));
    character.levelUpSkill('skill-8', null, skillRules);
    expect(character.experience.availableBonusDevPoints).toBe(0);
    expect(() => character.levelUpSkill('skill-8', null, skillRules)).toThrow(ValidationError);
  });

  it('levels up from level 0 without spending points and keeps the points returned by flaws', () => {
    const character = buildCharacter({ devPoints: 0 });
    character.addTrait('inept', 'Inept', false, 1, -4, 'perception');
    expect(character.experience.availableDevPoints).toBe(4);
    character.levelUp(false);
    expect(character.experience.availableDevPoints).toBe(64);
  });

  it('still requires spending the points from level 1 on', () => {
    const character = buildCharacter({ devPoints: 0, level: 1 });
    character.experience.availableDevPoints = 5;
    expect(() => character.levelUp(false)).toThrow(ValidationError);
    character.levelUp(true);
    expect(character.experience.availableDevPoints).toBe(60);
  });

  it('returns a developed rank to the pool it was paid from', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s], devPoints: 3, level: 1, bonusDevPoints: 20 });
    character.levelUpSkill('perception', null, skillRules); // 2 normal
    character.levelUpSkill('perception', null, skillRules); // 1 normal + 3 bonus
    expect(s.devPointsSpent).toEqual({ normal: 3, bonus: 3 });
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(3);

    character.levelDownSkill('perception', null);
    expect(character.experience.availableDevPoints).toBe(1);
    expect(character.experience.availableBonusDevPoints).toBe(20);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(0);
    character.levelDownSkill('perception', null);
    expect(character.experience.availableDevPoints).toBe(3);
    expect(s.devPointsSpent).toEqual({ normal: 0, bonus: 0 });
  });

  it('returns a trait to the pools it was paid from', () => {
    const character = buildCharacter({ devPoints: 4, level: 2, bonusDevPoints: 30 });
    character.addTrait('fast-attack', 'Fast Attack', true, 1, 10, undefined, {
      spend: { bonusDevPointsPerLevel: 25 },
      flawPool: 'normal',
    });
    expect(character.traits[0].paidWith).toEqual({ normal: 4, bonus: 6, flaw: 0, cappedBonus: 6, level: 2 });
    character.deleteTrait('fast-attack', undefined);
    expect([character.experience.availableDevPoints, character.experience.availableBonusDevPoints]).toEqual([4, 30]);
    expect(character.experience.bonusDevPointsSpentThisLevel).toBe(0);
  });
});
