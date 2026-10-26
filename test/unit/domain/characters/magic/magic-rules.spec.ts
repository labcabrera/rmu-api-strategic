import { describe, expect, it } from 'vitest';
import { rankBonus } from '../../../../../src/modules/characters/domain/services/skills/rank-bonus.js';
import { developmentCostKey, skillStatistics } from '../../../../../src/modules/characters/domain/services/skills/skill-development.js';
import {
  checkSpellListRealm,
  listTypeModifier,
  spellListSkill,
  type SpellListInfo,
} from '../../../../../src/modules/characters/domain/services/spells/spell-list-rules.js';
import { validateRealms } from '../../../../../src/modules/characters/domain/services/realms-rules.js';
import { restPowerPeriods, restPowerRecovery } from '../../../../../src/modules/characters/domain/services/power/power-rules.js';
import { characterRealms } from '../../../../../src/modules/characters/domain/value-objects/character-realm.vo.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';

// Invented lists (not book data)
const list = (props: Partial<SpellListInfo>): SpellListInfo => ({
  id: 'list-001',
  code: 'e2e-list',
  name: 'E2E list',
  realms: ['essence'],
  type: 'open',
  professionId: null,
  ...props,
});

const WEAPONS = ['melee', 'ranged', 'shield', 'unarmed'] as const;

describe('rankBonus (Core Law table 3-0b)', () => {
  it.each([
    [0, -25],
    [1, 5],
    [10, 50],
    [11, 53],
    [20, 80],
    [30, 100],
    [37, 107],
  ])('%i ranks give %i', (ranks, bonus) => {
    expect(rankBonus(ranks)).toBe(bonus);
  });
});

describe('validateRealms', () => {
  it('takes the fixed realm of a pure spellcaster', () => {
    expect(validateRealms(['essence'], { fixedRealmTypes: ['essence'] })).toEqual(['essence']);
  });

  it('requires both realms of a hybrid, in any order', () => {
    expect(validateRealms(['channeling', 'essence'], { fixedRealmTypes: ['essence', 'channeling'] })).toEqual(['essence', 'channeling']);
    expect(() => validateRealms(['essence'], { fixedRealmTypes: ['essence', 'channeling'] })).toThrow(ValidationError);
  });

  it('lets an arms profession choose one of the available realms', () => {
    const fighter = { fixedRealmTypes: [], availableRealmTypes: ['channeling', 'essence', 'mentalism'] };
    expect(validateRealms(['mentalism'], fighter)).toEqual(['mentalism']);
    expect(() => validateRealms(['mentalism', 'essence'], fighter)).toThrow(ValidationError);
    expect(() => validateRealms(['essence'], { availableRealmTypes: ['channeling'] })).toThrow(ValidationError);
  });

  it('rejects no realm, unknown realms and a fixed realm the profession does not have', () => {
    expect(() => validateRealms([], {})).toThrow(ValidationError);
    expect(() => validateRealms(['arcane'], {})).toThrow(ValidationError);
    expect(() => validateRealms(['channeling'], { fixedRealmTypes: ['essence'] })).toThrow(ValidationError);
  });

  it('accepts any single realm when the profession has none', () => {
    expect(validateRealms(['essence', 'essence'], {})).toEqual(['essence']);
  });
});

describe('characterRealms', () => {
  it('reads realmTypes, or the deprecated realmType of older documents', () => {
    expect(characterRealms({ realmType: 'essence', realmTypes: ['essence', 'mentalism'] })).toEqual(['essence', 'mentalism']);
    expect(characterRealms({ realmType: 'channeling' })).toEqual(['channeling']);
    expect(characterRealms(undefined)).toEqual([]);
  });
});

describe('spell list rules', () => {
  it('takes a Base list of the own profession as Base and of another one as Restricted', () => {
    const base = list({ type: 'base', professionId: 'magician' });
    expect(spellListSkill(base, 'magician')).toBe('base-spell-list');
    expect(spellListSkill(base, 'illusionist')).toBe('restricted-spell-list');
  });

  it('takes Open lists as Open and Closed and Evil lists as Closed', () => {
    expect(spellListSkill(list({ type: 'open' }), 'fighter')).toBe('open-spell-list');
    expect(spellListSkill(list({ type: 'closed' }), 'fighter')).toBe('closed-spell-list');
    expect(spellListSkill(list({ type: 'evil' }), 'fighter')).toBe('closed-spell-list');
  });

  it('accepts a list sharing a realm with the character and rejects the others', () => {
    expect(() => checkSpellListRealm(list({ realms: ['essence', 'mentalism'] }), ['mentalism'])).not.toThrow();
    expect(() => checkSpellListRealm(list({ realms: ['channeling'] }), ['essence'])).toThrow(ValidationError);
  });

  it('gives the list type modifier of the Spellcasting Roll', () => {
    expect(listTypeModifier('base-spell-list')).toBe(5);
    expect(listTypeModifier('open-spell-list')).toBe(0);
    expect(listTypeModifier('closed-spell-list')).toBe(-5);
    expect(listTypeModifier('restricted-spell-list')).toBe(-10);
    expect(listTypeModifier('anything-else')).toBe(-10);
  });
});

describe('skill development', () => {
  it('costs the spell list skills with the spells-* keys of the profession', () => {
    expect(developmentCostKey('base-spell-list', 'spellcasting', [...WEAPONS])).toBe('spells-base-open');
    expect(developmentCostKey('open-spell-list', 'spellcasting', [...WEAPONS])).toBe('spells-base-open');
    expect(developmentCostKey('closed-spell-list', 'spellcasting', [...WEAPONS])).toBe('spells-closed');
    expect(developmentCostKey('restricted-spell-list', 'spellcasting', [...WEAPONS])).toBe('spells-restricted');
    expect(developmentCostKey('magic-ritual', 'spellcasting', [...WEAPONS])).toBe('spells-ritual-magic');
  });

  it('keeps the combat groups and the category of the other skills', () => {
    expect(developmentCostKey('melee-weapon', 'combat', ['ranged', 'melee', 'shield', 'unarmed'])).toBe('combat2');
    expect(developmentCostKey('unarmed-st', 'combat', [...WEAPONS])).toBe('combat4');
    expect(developmentCostKey('perception', 'awareness', [...WEAPONS])).toBe('awareness');
  });

  it('adds the realm stat placeholder as many times as the category realm bonus', () => {
    expect(skillStatistics(['co'], { bonus: [], realmBonus: 2 })).toEqual(['co', 'realm', 'realm']);
    expect(skillStatistics(['me'], { bonus: [], realmBonus: '2' })).toEqual(['me', 'realm', 'realm']);
    expect(skillStatistics(['in'], { bonus: ['ag', 'sd'], realmBonus: null })).toEqual(['in', 'ag', 'sd']);
    expect(skillStatistics(['in'], undefined)).toEqual(['in']);
  });
});

describe('power recovery (Spell Law 4.1)', () => {
  it('counts periods of 2 complete hours, at most 4 a day', () => {
    expect(restPowerPeriods(1, 0)).toBe(0);
    expect(restPowerPeriods(4, 0)).toBe(2);
    expect(restPowerPeriods(8, 0)).toBe(4);
    expect(restPowerPeriods(12, 0)).toBe(4);
    expect(restPowerPeriods(0, 2)).toBe(8);
    expect(restPowerPeriods(26, 0)).toBe(5);
  });

  it('recovers 10% of the maximum per period, rounded up', () => {
    expect(restPowerRecovery(60, 4)).toBe(24);
    expect(restPowerRecovery(60, 2)).toBe(12);
    expect(restPowerRecovery(15, 1)).toBe(2);
    expect(restPowerRecovery(0, 4)).toBe(0);
    expect(restPowerRecovery(60, 0)).toBe(0);
  });
});
