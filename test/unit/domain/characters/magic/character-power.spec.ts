import { describe, expect, it } from 'vitest';
import { buildCharacter, skill } from '../traits/character.fixture.js';
import { SkillProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/skill-processor.js';
import { PowerProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/power-processor.js';
import { CharacterSkill } from '../../../../../src/modules/characters/domain/value-objects/character-skill.vo.js';
import type { CharacterStat } from '../../../../../src/modules/characters/domain/value-objects/character-stat.vo.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';

const withBonus = (totalBonus: number) => ({ totalBonus }) as CharacterStat;

const powerDevelopment = (ranks: number) => {
  const result = CharacterSkill.empty('power-development', null, ['co', 'realm', 'realm'], [2, 4], 0);
  result.ranks = ranks;
  return result;
};

describe('realm stat and power points', () => {
  it('adds the realm stat twice to the realm categories, the lowest one for a hybrid', () => {
    const character = buildCharacter({ skills: [powerDevelopment(8)] });
    character.statistics.co = withBonus(2);
    character.statistics.em = withBonus(5);
    character.statistics.pr = withBonus(8);
    character.info.realmTypes = ['essence', 'mentalism'];
    new SkillProcessor().process(character, []);
    new PowerProcessor().process(character);
    // 8 ranks (40) + Co 2 + Em 5 + Em 5, as the Mystic of Spell Law 4.1 without the professional bonus
    expect(character.skills[0].statBonus).toBe(12);
    expect(character.power).toEqual({ max: 52, current: 52 });
  });

  it('uses the single realm of older documents', () => {
    const character = buildCharacter({ skills: [powerDevelopment(1)] });
    character.statistics.co = withBonus(0);
    character.statistics.em = withBonus(10);
    new SkillProcessor().process(character, []);
    expect(character.skills[0].totalBonus).toBe(25);
  });

  it('applies table 3-0b to every skill', () => {
    const character = buildCharacter({ skills: [skill('perception', null, 20), skill('jumping')] });
    new SkillProcessor().process(character, []);
    expect(character.skills.find(s => s.skillId === 'perception')!.developmentBonus).toBe(80);
    expect(character.skills.find(s => s.skillId === 'jumping')!.developmentBonus).toBe(-25);
  });
});

describe('Character power points', () => {
  const caster = (max: number, current: number) => {
    const character = buildCharacter();
    character.power = { max, current };
    return character;
  };

  it('spends power points and refuses to go below zero', () => {
    const character = caster(20, 10);
    character.spendPower(4);
    expect(character.power).toEqual({ max: 20, current: 6 });
    expect(() => character.spendPower(7)).toThrow(ValidationError);
  });

  it('restores power points up to the maximum', () => {
    const character = caster(20, 10);
    character.restorePower(25);
    expect(character.power!.current).toBe(20);
  });

  it('refuses both without power points', () => {
    const character = buildCharacter();
    expect(() => character.spendPower(1)).toThrow(ValidationError);
    expect(() => character.restorePower(1)).toThrow(ValidationError);
  });

  it('recovers power points resting and records them', () => {
    const character = caster(60, 10);
    character.hp = { max: 30, current: 30 };
    const result = character.rest(30, 0, '2026-10-26T10:00:00.000Z', {}, 4);
    expect(result).toMatchObject({ powerBefore: 10, powerAfter: 34 });
    expect(character.rest(30, 0, '2026-10-26T10:00:00.000Z', {}, 40).powerAfter).toBe(60);
  });

  it('rests without power points', () => {
    const character = buildCharacter();
    character.hp = { max: 30, current: 30 };
    expect(character.rest(30, 0, '2026-10-26T10:00:00.000Z', {}, 4)).toMatchObject({ powerBefore: null, powerAfter: null });
  });
});
