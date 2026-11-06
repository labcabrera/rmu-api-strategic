import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { AttackProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/attack-processor.js';
import { DefenseProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/defense-processor.js';
import { EquipmentProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/equipment-processor.js';
import { HPProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/hp-processor.js';
import { InitiativeProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/initiative-processor.js';
import { MovementProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/movement-processor.js';
import { PowerProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/power-processor.js';
import { ResistancesProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/resistances-processor.js';
import { SkillProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/skill-processor.js';
import { StatProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/stat-processor.js';
import { XPProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/xp-processor.js';
import { restPeriodHours, restPowerPeriods } from '../../../../../src/modules/characters/domain/services/power/power-rules.js';
import type { CharacterTrait } from '../../../../../src/modules/characters/domain/value-objects/character-trait.vo.js';
import type { Item } from '../../../../../src/modules/items/domain/aggregates/item.js';
import { ItemWeaponRange } from '../../../../../src/modules/items/domain/value-objects/item-weapon-range.vo.js';
import { buildCharacter, skill, trait, weapon } from '../traits/character.fixture.js';

// Workspace spec 079, phase 7 (D1, D2): invented numbers, no book text.

const processor = new CharacterProcessorService(
  new StatProcessor(),
  new MovementProcessor(),
  new InitiativeProcessor(),
  new SkillProcessor(),
  new EquipmentProcessor(),
  new HPProcessor(),
  new PowerProcessor(),
  new DefenseProcessor(),
  new XPProcessor(),
  new AttackProcessor(),
  new ResistancesProcessor(),
);

const gear = (id: string, weight: number): Item =>
  ({
    id,
    itemTypeId: 'gear',
    info: { weight },
    units: 1,
    carried: true,
    weapon: null,
    shield: null,
    armor: null,
    modifiers: [],
  }) as unknown as Item;

/** 100 lb of body weight, St bonus 0 (allowance 15 %), carrying `load` lb. */
const sheet = (traits: CharacterTrait[], load = 0, items: Item[] = []): Character => {
  const character = buildCharacter({ traits, skills: [skill('body-development', null, 2), skill('ranged-weapon', 'bow', 2)] });
  character.info.weight = 100;
  processor.process(character, [...(load ? [gear('pack', load)] : []), ...items]);
  return character;
};

describe('spec 079, D2: Vigorous and Feeble', () => {
  it('gives +10 per tier of Vigorous to the endurance trait bonus', () => {
    expect(sheet([trait('vigorous', 2)]).endurance.traitBonus).toBe(20);
  });

  it('gives -10 per tier of Feeble', () => {
    expect(sheet([trait('feeble', 3)]).endurance.traitBonus).toBe(-30);
  });

  it('is 0 without them', () => {
    expect(sheet([]).endurance.traitBonus).toBe(0);
  });
});

describe('spec 079, D2: Beast of Burden and Overweight', () => {
  it('carries 10 % of the body weight per tier without penalty, but the dodge keeps the whole penalty', () => {
    const without = sheet([], 40);
    expect(without.equipment.encumbrancePenalty).toBe(-25);
    expect(without.equipment.dodgeEncumbrancePenalty).toBe(-25);
    const strong = sheet([trait('beast-of-burden', 2)], 40);
    expect(strong.equipment.encumbrancePenalty).toBe(-5);
    expect(strong.equipment.dodgeEncumbrancePenalty).toBe(-25);
    expect(strong.equipment.weightAllowance).toBe(35);
  });

  it('never turns the allowance into a bonus', () => {
    expect(sheet([trait('beast-of-burden', 3)], 10).equipment.encumbrancePenalty).toBe(0);
  });

  it('moves the thresholds of the maximum pace', () => {
    expect(sheet([], 40).movement.maxPace).toBe('run');
    expect(sheet([trait('beast-of-burden', 2)], 40).movement.maxPace).toBe('sprint');
  });

  it('counts Overweight in the load penalty and in the maximum pace, also for the dodge', () => {
    const heavy = sheet([trait('overweight', 1)], 20);
    expect(heavy.equipment.encumbrancePenalty).toBe(-15);
    expect(heavy.equipment.dodgeEncumbrancePenalty).toBe(-15);
    expect(heavy.movement.maxPace).toBe('sprint');
  });

  it('lets Beast of Burden offset Overweight', () => {
    const both = sheet([trait('overweight', 1), trait('beast-of-burden', 1)], 20);
    expect(both.equipment.encumbrancePenalty).toBe(-5);
    expect(both.equipment.dodgeEncumbrancePenalty).toBe(-15);
  });
});

describe('spec 079, D1: Deadeye share of the ranges', () => {
  const bow = weapon('bow', 'ranged-weapon@bow', [
    new ItemWeaponRange(0, 10, 0),
    new ItemWeaponRange(10, 50, -10),
    new ItemWeaponRange(50, 100, -25),
  ]);

  it('keeps the part of each range bonus the trait gave', () => {
    const character = sheet([trait('deadeye', 2, 'bow')], 0, [bow]);
    character.equipment.slots = { mainHand: 'bow' } as never;
    processor.process(character, [bow]);
    expect(character.attacks[0].ranges!.map(r => [r.bonus, r.traitBonus])).toEqual([
      [0, 0],
      [0, 10],
      [-5, 20],
    ]);
  });

  it('is 0 without Deadeye', () => {
    const character = sheet([], 0, [bow]);
    character.equipment.slots = { mainHand: 'bow' } as never;
    processor.process(character, [bow]);
    expect(character.attacks[0].ranges!.every(r => r.traitBonus === 0)).toBe(true);
  });
});

describe('spec 079, D2: Efficient and Restless Sleeper', () => {
  it('keeps periods of 2 hours without them', () => {
    expect(restPeriodHours([])).toBe(2);
  });

  it('shortens the period to 3/4 and 1/2 with Efficient Sleeper', () => {
    expect(restPeriodHours([{ traitId: 'efficient-sleeper', tier: 1 }])).toBe(1.5);
    expect(restPeriodHours([{ traitId: 'efficient-sleeper', tier: 2 }])).toBe(1);
  });

  it('lengthens it to 5/4 and 6/4 with Restless Sleeper', () => {
    expect(restPeriodHours([{ traitId: 'restless-sleeper', tier: 1 }])).toBe(2.5);
    expect(restPeriodHours([{ traitId: 'restless-sleeper', tier: 2 }])).toBe(3);
  });

  it('recovers faster but never more than 4 periods a day', () => {
    expect(restPowerPeriods(3, 0, 1.5)).toBe(2);
    expect(restPowerPeriods(4, 0, 1)).toBe(4);
    expect(restPowerPeriods(8, 0, 1)).toBe(4);
    expect(restPowerPeriods(0, 2, 1)).toBe(8);
  });

  it('recovers slower with Restless Sleeper', () => {
    expect(restPowerPeriods(8, 0, 3)).toBe(2);
    expect(restPowerPeriods(5, 0, 2.5)).toBe(2);
  });
});
