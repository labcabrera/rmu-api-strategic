import {
  matchesAttack,
  matchesAttackSkill,
  matchesKey,
  matchesSkill,
  matchesWeaponType,
} from '../../../../../src/modules/characters/domain/services/character/traits/trait-specialization-matcher';

describe('Trait specialization matcher', () => {
  describe('skills', () => {
    it('a skill id matches every specialization of the skill', () => {
      expect(matchesSkill('perception', 'perception', 'sight')).toBe(true);
      expect(matchesSkill('perception', 'perception', null)).toBe(true);
      expect(matchesSkill('perception', 'navigation', null)).toBe(false);
    });

    it('a skill id with specialization matches only that specialization', () => {
      expect(matchesSkill('perception@sight', 'perception', 'sight')).toBe(true);
      expect(matchesSkill('perception@sight', 'perception', 'hearing')).toBe(false);
      expect(matchesSkill('perception@sight', 'perception', null)).toBe(false);
    });

    it('never matches an empty value', () => {
      expect(matchesSkill(undefined, 'perception', null)).toBe(false);
      expect(matchesSkill('', 'perception', null)).toBe(false);
    });
  });

  describe('attack skills', () => {
    it('compares against the weapon skill id', () => {
      expect(matchesAttackSkill('melee-weapon@blade', 'melee-weapon@blade')).toBe(true);
      expect(matchesAttackSkill('melee-weapon', 'melee-weapon@blade')).toBe(true);
      expect(matchesAttackSkill('melee-weapon@hafted', 'melee-weapon@blade')).toBe(false);
      expect(matchesAttackSkill('shield', 'shield')).toBe(true);
      expect(matchesAttackSkill('shield', undefined)).toBe(false);
    });
  });

  describe('weapon types', () => {
    it('compares the weapon type with the specialization of the weapon skill', () => {
      expect(matchesWeaponType('ranged-weapon-type', 'bow', 'ranged-weapon@bow')).toBe(true);
      expect(matchesWeaponType('ranged-weapon-type', 'bow', 'ranged-weapon@crossbow')).toBe(false);
      expect(matchesWeaponType('melee-weapon-type', 'blade', 'melee-weapon@blade')).toBe(true);
    });

    it('does not mix melee and ranged weapon types', () => {
      expect(matchesWeaponType('ranged-weapon-type', 'exotic', 'melee-weapon@exotic')).toBe(false);
      expect(matchesWeaponType('melee-weapon-type', 'exotic', 'melee-weapon@exotic')).toBe(true);
    });

    it('dispatches by specialization kind', () => {
      expect(matchesAttack('skill', 'ranged-weapon@bow', 'ranged-weapon@bow')).toBe(true);
      expect(matchesAttack('ranged-weapon-type', 'bow', 'ranged-weapon@bow')).toBe(true);
      expect(matchesAttack('stat', 'st', 'ranged-weapon@bow')).toBe(false);
    });
  });

  describe('stats and realms', () => {
    it('compares the key', () => {
      expect(matchesKey('st', 'st')).toBe(true);
      expect(matchesKey('st', 'ag')).toBe(false);
      expect(matchesKey('essence', 'essence')).toBe(true);
      expect(matchesKey(undefined, 'essence')).toBe(false);
    });
  });
});
