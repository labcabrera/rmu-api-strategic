import { describe, expect, it } from 'vitest';
import {
  allocateStyleAbility,
  freeStyleRanks,
  removeStyleAbility,
  trimStyleAbilities,
  unallocatedStyleBonus,
} from '../../../../../src/modules/characters/domain/services/fighting-styles/style-allocation.js';
import type { FightingStyleCatalog } from '../../../../../src/modules/characters/domain/value-objects/fighting-styles.vo.js';
import { buildCharacter, skill, trait } from '../traits/character.fixture.js';

// Made-up styles, not the rulebook ones
const CATALOG: FightingStyleCatalog = {
  styles: [
    {
      id: 'test-style',
      skillId: 'battle-styles',
      abilities: [
        { abilityId: 'plain', cost: 2 },
        { abilityId: 'needs-skill', cost: 1 },
        { abilityId: 'needs-trait', cost: 1 },
      ],
      requiresSkills: [],
      requiresTraits: [],
    },
    {
      id: 'demanding-style',
      skillId: 'battle-styles',
      abilities: [{ abilityId: 'plain', cost: 1 }],
      requiresSkills: ['melee-weapon@chain'],
      requiresTraits: [],
    },
  ],
  abilities: [
    { id: 'plain', repeatable: true, maxTimes: null, requiresAbilities: [], requiresSkills: [], requiresTraits: [] },
    { id: 'needs-skill', repeatable: false, maxTimes: null, requiresAbilities: [], requiresSkills: ['fortitude'], requiresTraits: [] },
    { id: 'needs-trait', repeatable: false, maxTimes: null, requiresAbilities: [], requiresSkills: [], requiresTraits: ['frenzy'] },
  ],
};

describe('fighting style allocation', () => {
  it('gives +2 OB per free rank, at most +10', () => {
    expect([0, 1, 4, 5, 9].map(unallocatedStyleBonus)).toEqual([0, 2, 8, 10, 10]);
  });

  it('needs the skills and talents of the ability and of the style', () => {
    const style = skill('battle-styles', 'test-style', 4);
    const character = buildCharacter({ skills: [style] });
    expect(() => allocateStyleAbility(character, 'battle-styles', 'test-style', 'needs-skill', CATALOG)).toThrow(/fortitude/);
    expect(() => allocateStyleAbility(character, 'battle-styles', 'test-style', 'needs-trait', CATALOG)).toThrow(/frenzy/);

    character.skills.push(skill('fortitude', null, 1));
    character.traits.push(trait('frenzy'));
    allocateStyleAbility(character, 'battle-styles', 'test-style', 'needs-skill', CATALOG);
    allocateStyleAbility(character, 'battle-styles', 'test-style', 'needs-trait', CATALOG);
    expect(freeStyleRanks(style)).toBe(2);

    const demanding = skill('battle-styles', 'demanding-style', 2);
    character.skills.push(demanding);
    expect(() => allocateStyleAbility(character, 'battle-styles', 'demanding-style', 'plain', CATALOG)).toThrow(/melee-weapon@chain/);
    character.skills.push(skill('melee-weapon', 'chain', 1));
    allocateStyleAbility(character, 'battle-styles', 'demanding-style', 'plain', CATALOG);
    expect(demanding.styleAbilities).toEqual([{ abilityId: 'plain', times: 1, cost: 1 }]);
  });

  it('rejects unknown styles and abilities that were not selected', () => {
    const character = buildCharacter({ skills: [skill('battle-styles', 'other-style', 2)] });
    expect(() => allocateStyleAbility(character, 'battle-styles', 'other-style', 'plain', CATALOG)).toThrow(/not found/);
    expect(() => removeStyleAbility(character, 'battle-styles', 'other-style', 'plain')).toThrow(/not selected/);
    expect(() => allocateStyleAbility(character, 'battle-styles', null, 'plain', CATALOG)).toThrow(/not found/);
  });

  it('undoes the last selections when the ranks no longer cover them', () => {
    const style = skill('battle-styles', 'test-style', 6);
    style.styleAbilities = [
      { abilityId: 'needs-skill', times: 1, cost: 1 },
      { abilityId: 'plain', times: 2, cost: 2 },
    ];
    style.ranks = 3;
    trimStyleAbilities(style);
    expect(style.styleAbilities).toEqual([
      { abilityId: 'needs-skill', times: 1, cost: 1 },
      { abilityId: 'plain', times: 1, cost: 2 },
    ]);
    style.ranks = 0;
    trimStyleAbilities(style);
    expect(style.styleAbilities).toEqual([]);
  });
});
