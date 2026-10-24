import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors';
import { buildCharacter, skill } from '../traits/character.fixture';

const rules = (allowThirdRank: boolean) => ({ bonusDevPointsPerLevel: 25, allowThirdRank });

const errorCode = (fn: () => void): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as ValidationError).errorCode;
  }
  return undefined;
};

describe('Skill ranks per level', () => {
  it('acceptance 7: a third rank in the same level fails with err-skill-max-ranks-per-level', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s], level: 1 });
    character.levelUpSkill('perception', null, rules(false));
    character.levelUpSkill('perception', null, rules(false));
    expect(errorCode(() => character.levelUpSkill('perception', null, rules(false)))).toBe('err-skill-max-ranks-per-level');
    expect(s.ranks).toBe(2);
    expect(character.experience.availableDevPoints).toBe(54);
  });

  it('allows a third rank with allowThirdRank, at the cost of the second one, and never a fourth', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s], level: 1 });
    [1, 2, 3].forEach(() => character.levelUpSkill('perception', null, rules(true)));
    expect(s.ranks).toBe(3);
    expect(character.experience.availableDevPoints).toBe(60 - 2 - 4 - 4);
    expect(errorCode(() => character.levelUpSkill('perception', null, rules(true)))).toBe('err-skill-max-ranks-per-level');
  });

  it('does not count culture ranks towards the limit', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s] });
    character.applyCulture('culture-001', [{ skillId: 'perception', specialization: null, ranks: 2 }]);
    character.levelUp(false);
    character.levelUpSkill('perception', null, rules(false));
    character.levelUpSkill('perception', null, rules(false));
    expect([s.ranks, s.cultureRanks, s.ranksDeveloped]).toEqual([4, 2, 2]);
  });

  it('never levels a skill down below its culture ranks', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s] });
    character.applyCulture('culture-001', [{ skillId: 'perception', specialization: null, ranks: 1 }]);
    character.levelUp(false);
    character.levelUpSkill('perception', null, rules(false));
    character.levelDownSkill('perception', null);
    expect([s.ranks, s.cultureRanks]).toEqual([1, 1]);
    expect(() => character.levelDownSkill('perception', null)).toThrow(ValidationError);
    expect(s.ranks).toBe(1);
  });

  it('starts counting again at every level up', () => {
    const s = skill('perception');
    const character = buildCharacter({ skills: [s], level: 1 });
    character.levelUpSkill('perception', null, rules(false));
    character.levelUpSkill('perception', null, rules(false));
    character.levelUp(true);
    character.levelUpSkill('perception', null, rules(false));
    expect([s.ranks, s.ranksDeveloped]).toEqual([3, 1]);
  });
});
