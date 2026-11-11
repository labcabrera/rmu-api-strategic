import { buildCharacter, skill } from '../traits/character.fixture.js';
import type { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import type { CharacterSkill } from '../../../../../src/modules/characters/domain/value-objects/character-skill.vo.js';
import { isLoreOrLanguage } from '../../../../../src/modules/characters/domain/services/skills/intense-training.js';

// Workspace spec 076, A1 (plan 1.3): intense training replaces allowThirdRank
const rules = (intenseTraining: boolean) => ({ bonusDevPointsPerLevel: 25, intenseTraining });

const errorCode = (fn: () => void): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

const withCost = (s: CharacterSkill, development: number[]): CharacterSkill => {
  (s as { development: number[] }).development = development;
  return s;
};

const levelUp = (character: Character, skillId: string, times: number, intense = true, specialization: string | null = null) => {
  for (let i = 0; i < times; i++) character.levelUpSkill(skillId, specialization, rules(intense));
};

describe('Intense training', () => {
  it('Kelgryn: three ranks of a 2/3 skill cost 2 + 3 + 3 = 8 development points', () => {
    const riding = withCost(skill('riding', 'horse', 2), [2, 3]);
    const character = buildCharacter({ skills: [riding], level: 3, devPoints: 60 });
    levelUp(character, 'riding', 3, true, 'horse');
    expect([riding.ranks, riding.ranksDeveloped]).toEqual([5, 3]);
    expect(riding.devPointsSpent).toEqual({ normal: 8, bonus: 0 });
    expect(character.experience.availableDevPoints).toBe(52);
    expect(character.experience.intenseTrainingSkill).toEqual({ skillId: 'riding', specialization: 'horse' });
  });

  it('without the game option a third rank fails with err-skill-max-ranks-per-level', () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 3 });
    levelUp(character, 'perception', 2, false);
    expect(errorCode(() => character.levelUpSkill('perception', null, rules(false)))).toBe('err-skill-max-ranks-per-level');
    expect(character.experience.intenseTrainingSkill).toBeNull();
  });

  it('allows a single skill per level: a second one fails with err-skill-intense-training-taken', () => {
    const [perception, climbing] = [skill('perception'), skill('climbing')];
    const character = buildCharacter({ skills: [perception, climbing], level: 3 });
    levelUp(character, 'perception', 3);
    levelUp(character, 'climbing', 2);
    expect(errorCode(() => character.levelUpSkill('climbing', null, rules(true)))).toBe('err-skill-intense-training-taken');
    // The skill trained intensely keeps taking ranks
    levelUp(character, 'perception', 1);
    expect(perception.ranksDeveloped).toBe(4);
  });

  it('stops a skill with ranks equal to twice the level: err-skill-intense-training-limit', () => {
    const perception = skill('perception', null, 4);
    const character = buildCharacter({ skills: [perception], level: 3 });
    levelUp(character, 'perception', 2);
    expect(perception.ranks).toBe(6);
    expect(errorCode(() => character.levelUpSkill('perception', null, rules(true)))).toBe('err-skill-intense-training-limit');
    expect(character.experience.intenseTrainingSkill).toBeNull();
  });

  it('counts culture ranks in that limit, and level 0 as level 1', () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 0, devPoints: 0, bonusDevPoints: 25 });
    character.applyCulture('culture-001', [{ skillId: 'perception', specialization: null, ranks: 1 }]);
    levelUp(character, 'perception', 2);
    expect(perception.ranks).toBe(3);
    expect(errorCode(() => character.levelUpSkill('perception', null, rules(true)))).toBe('err-skill-intense-training-limit');
  });

  it('exempts lore skills and languages from the twice the level limit, not from the one skill rule (P2)', () => {
    const language = skill('language-spoken', 'common', 2, 'lore');
    const lore = skill('region-lore', 'north', 0, 'lore');
    const character = buildCharacter({ skills: [language, lore], level: 1 });
    levelUp(character, 'language-spoken', 4, true, 'common');
    expect(language.ranks).toBe(6);
    levelUp(character, 'region-lore', 2, true, 'north');
    expect(errorCode(() => character.levelUpSkill('region-lore', 'north', rules(true)))).toBe('err-skill-intense-training-taken');
  });

  it('recognises lore skills by category, and by id when the skill has no category', () => {
    expect(isLoreOrLanguage({ skillId: 'language-written', categoryId: 'lore' })).toBe(true);
    expect(isLoreOrLanguage({ skillId: 'perception', categoryId: 'awareness' })).toBe(false);
    expect(isLoreOrLanguage({ skillId: 'language-spoken', categoryId: undefined })).toBe(true);
    expect(isLoreOrLanguage({ skillId: 'region-lore', categoryId: undefined })).toBe(true);
    expect(isLoreOrLanguage({ skillId: 'climbing', categoryId: undefined })).toBe(false);
  });

  it('frees the mark when the skill goes back to two ranks, so another skill may take it', () => {
    const [perception, climbing] = [skill('perception'), skill('climbing')];
    const character = buildCharacter({ skills: [perception, climbing], level: 3 });
    levelUp(character, 'perception', 3);
    character.levelDownSkill('perception', null);
    expect(character.experience.intenseTrainingSkill).toBeNull();
    levelUp(character, 'climbing', 3);
    expect(character.experience.intenseTrainingSkill).toEqual({ skillId: 'climbing', specialization: null });
    // The refund of an intense rank is its second cost
    character.levelDownSkill('climbing', null);
    expect(climbing.devPointsSpent).toEqual({ normal: 6, bonus: 0 });
  });

  it('clears the mark at every level up from level 1 on', () => {
    const perception = skill('perception');
    const character = buildCharacter({ skills: [perception], level: 3 });
    levelUp(character, 'perception', 3);
    character.levelUp(true);
    expect(character.experience.intenseTrainingSkill).toBeNull();
  });
});
