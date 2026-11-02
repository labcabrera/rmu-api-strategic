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
import { CharacterTrait } from '../../../../../src/modules/characters/domain/value-objects/character-trait.vo.js';
import { CharacterSkill } from '../../../../../src/modules/characters/domain/value-objects/character-skill.vo.js';
import { Item } from '../../../../../src/modules/items/domain/aggregates/item.js';
import { ItemWeapon } from '../../../../../src/modules/items/domain/value-objects/item-weapon.vo.js';
import { ItemWeaponMode } from '../../../../../src/modules/items/domain/value-objects/item-weapon-mode.vo.js';
import { ItemWeaponRange } from '../../../../../src/modules/items/domain/value-objects/item-weapon-range.vo.js';
import { buildCharacter, skill, trait, weapon } from './character.fixture.js';

// Character Companion talents and flaws (workspace spec 039)

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

const knack = (s: CharacterSkill): CharacterSkill => {
  s.professional = ['knack'];
  return s;
};

const professional = (s: CharacterSkill): CharacterSkill => {
  s.professional = ['professional'];
  return s;
};

const SKILLS = () => [
  skill('perception', 'sight', 0, 'awareness'),
  skill('history', null, 0, 'lore'),
  skill('language-common', null, 0, 'lore'),
  skill('mathematics', null, 0, 'science'),
  skill('engineering', null, 0, 'science'),
  skill('locks', null, 0, 'technical'),
  skill('influence', null, 0, 'social'),
  skill('leadership', null, 0, 'social'),
  skill('stalking', null, 0, 'subterfuge'),
  skill('acting', null, 0, 'performance-art'),
  skill('music', 'flute', 0, 'performance-art'),
  skill('music-composition', null, 0, 'composition'),
  skill('magic-ritual', 'essence', 0, 'spellcasting'),
  knack(skill('climbing', null, 0, 'gymnastic')),
  professional(skill('swimming', null, 20, 'gymnastic')),
  professional(skill('running', null, 40, 'gymnastic')),
  skill('melee-weapon', 'blade', 10, 'combat-training'),
  skill('melee-weapon', 'hafted', 0, 'combat-training'),
  skill('ranged-weapon', 'bow', 0, 'combat-training'),
  skill('ranged-weapon', 'thrown', 0, 'combat-training'),
];

const process = (traits: CharacterTrait[], items: Item[] = [], slots: Record<string, string | null> = {}): Character => {
  const character = buildCharacter({ traits, skills: SKILLS(), slots });
  processor.process(character, items);
  return character;
};

const findSkill = (character: Character, skillId: string, specialization: string | null = null) =>
  character.skills.find(s => s.skillId === skillId && s.specialization === specialization)!;

const resistance = (character: Character, id: string) => character.resistances.find(r => r.resistance === id)!.traitBonus;

const ranges = [new ItemWeaponRange(0, 10, 0), new ItemWeaponRange(11, 30, -10), new ItemWeaponRange(31, 60, -25)];

const thrownDagger = (): Item =>
  ({
    id: 'dagger',
    itemTypeId: 'weapon',
    info: { length: 0.3, weight: 1 },
    carried: true,
    weapon: new ItemWeapon('ranged-weapon@thrown', 3, [new ItemWeaponMode('one-hand', ['thrown'], 'table', 'thrown', 0, ranges)]),
    shield: null,
    armor: null,
  }) as unknown as Item;

describe('Character Companion trait effects', () => {
  const baseline = process([]);

  describe('skills', () => {
    it('skill categories: eidetic memory (fixed), quick calculator and visualization', () => {
      const character = process([trait('eidetic-memory'), trait('quick-calculator', 2), trait('visualization', 1)]);
      expect(findSkill(character, 'history').traitBonus).toBe(10);
      expect(findSkill(character, 'language-common').traitBonus).toBe(10);
      expect(findSkill(character, 'mathematics').traitBonus).toBe(10);
      // Visualization: technical category plus engineering
      expect(findSkill(character, 'engineering').traitBonus).toBe(15);
      expect(findSkill(character, 'locks').traitBonus).toBe(5);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(0);
    });

    it('prodigy greater applies to the chosen skill category and does not stack with prodigy', () => {
      const character = process([
        trait('prodigy-greater', 2, 'gymnastic'),
        trait('prodigy', 1, 'climbing'),
        trait('prodigy', 3, 'swimming'),
      ]);
      expect(findSkill(character, 'climbing').traitBonus).toBe(10);
      expect(findSkill(character, 'swimming').traitBonus).toBe(15);
      expect(findSkill(character, 'running').traitBonus).toBe(10);
      expect(findSkill(character, 'history').traitBonus).toBe(0);
    });

    it('master of ceremonies and musical share their groups with prodigy and perfect pitch', () => {
      const character = process([
        trait('master-of-ceremonies', 2),
        trait('prodigy', 1, 'magic-ritual'),
        trait('musical', 1),
        trait('perfect-pitch', 1),
      ]);
      expect(findSkill(character, 'magic-ritual', 'essence').traitBonus).toBe(10);
      expect(findSkill(character, 'music', 'flute').traitBonus).toBe(10);
      expect(findSkill(character, 'music-composition').traitBonus).toBe(10);
    });

    it('enhanced knack only applies to a skill with a knack', () => {
      const character = process([trait('enhanced-knack', 2, 'climbing'), trait('enhanced-knack', 2, 'running')]);
      expect(findSkill(character, 'climbing').traitBonus).toBe(10);
      expect(findSkill(character, 'running').traitBonus).toBe(0);
    });

    it('professional skill focus doubles the professional bonus up to 60', () => {
      const character = process([
        trait('professional-skill-focus', undefined, 'swimming'),
        trait('professional-skill-focus', undefined, 'running'),
      ]);
      expect(findSkill(character, 'swimming').professionalBonus).toBe(40);
      expect(findSkill(character, 'running').professionalBonus).toBe(60);
      expect(baseline.skills.find(s => s.skillId === 'running')!.professionalBonus).toBe(30);
    });

    it('subtlety, oblivious and socially awkward', () => {
      const character = process([trait('subtlety', 1), trait('oblivious')]);
      expect(findSkill(character, 'stalking').traitBonus).toBe(5);
      expect(findSkill(character, 'leadership').traitBonus).toBe(-5);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(-15);
      // Tier I is situational: nothing on the sheet
      expect(findSkill(process([trait('socially-awkward', 1)]), 'influence').traitBonus).toBe(0);
      const awkward = process([trait('socially-awkward', 2)]);
      expect(findSkill(awkward, 'influence').traitBonus).toBe(-20);
      expect(findSkill(awkward, 'acting').traitBonus).toBe(-20);
    });
  });

  describe('statistics, resistances and initiative', () => {
    it('dwarfism, giantism and blessed by a war god', () => {
      const dwarf = process([trait('dwarfism')]);
      expect(dwarf.statistics.qu.modifiers.trait).toBe(3);
      expect(dwarf.statistics.st.modifiers.trait).toBe(-3);
      const blessed = process([trait('blessed-by-a-war-god'), trait('giantism')]);
      expect(blessed.statistics.st.modifiers.trait).toBe(13);
      expect(blessed.statistics.qu.modifiers.trait).toBe(7);
      expect(blessed.statistics.ag.modifiers.trait).toBe(10);
      expect(blessed.statistics.em.modifiers.trait).toBeUndefined();
    });

    it('fear and realm resistances', () => {
      const character = process([trait('composure', 2), trait('panicky'), trait('unbeliever')]);
      expect(resistance(character, 'fear')).toBe(0);
      expect(resistance(character, 'essence')).toBe(20);
      expect(resistance(character, 'mentalism')).toBe(20);
    });

    it('magical susceptibility: one realm at tier I, every realm at tier II', () => {
      const one = process([trait('magical-susceptibility', 1, 'essence')]);
      expect(['channeling', 'essence', 'mentalism'].map(r => resistance(one, r))).toEqual([0, -20, 0]);
      const all = process([trait('magical-susceptibility', 2, 'essence')]);
      expect(['channeling', 'essence', 'mentalism'].map(r => resistance(all, r))).toEqual([-20, -20, -20]);
    });

    it('sloth lowers initiative, OB and DB by 10', () => {
      const sword = weapon('sword', 'melee-weapon@blade');
      const character = process([trait('sloth')], [sword], { mainHand: 'sword' });
      expect(character.initiative.modifiers.trait).toBe(-10);
      expect(character.defense.modifiers.sloth).toBe(-10);
      expect(character.attacks[0].boModifiers.sloth).toBe(-10);
    });

    it('dense musculature adds 10 to OB and DB', () => {
      const sword = weapon('sword', 'melee-weapon@blade');
      const character = process([trait('dense-musculature')], [sword], { mainHand: 'sword' });
      expect(character.defense.modifiers['dense-musculature']).toBe(10);
      expect(character.attacks[0].boModifiers['dense-musculature']).toBe(10);
    });
  });

  describe('movement', () => {
    it('blazing speed and slow change the BMR, never below 5', () => {
      expect(process([trait('blazing-speed', 2)]).movement.baseMovementRate).toBe(baseline.movement.baseMovementRate + 10);
      expect(process([trait('slow', 1)]).movement.baseMovementRate).toBe(baseline.movement.baseMovementRate - 5);
      expect(process([trait('slow', 5)]).movement.baseMovementRate).toBe(5);
    });

    it('bad leg halves the BMR, lowers Qu by 3 and the OB by 10', () => {
      const character = process([trait('bad-leg')]);
      expect(character.statistics.qu.modifiers.trait).toBe(-3);
      const qu = character.statistics.qu.totalBonus / 2;
      expect(character.movement.baseMovementRate).toBeCloseTo((20 + qu) * 0.5);
    });

    it('overweight counts as 10% encumbrance per tier', () => {
      expect(baseline.movement.maxPace).toBe('dash');
      expect(process([trait('overweight', 2)]).movement.maxPace).toBe('sprint');
      expect(process([trait('overweight', 4)]).movement.maxPace).toBe('run');
    });
  });

  describe('attacks', () => {
    const sword = weapon('sword', 'melee-weapon@blade');
    const mace = weapon('mace', 'melee-weapon@hafted');

    it('weapon control: -2 for its weapon type, -1 for the others, min 1, before fumbler', () => {
      // base fumble 3; blade has 10 ranks (-2)
      expect(process([], [sword, mace], { mainHand: 'sword', offHand: 'mace' }).attacks.map(a => a.fumble)).toEqual([1, 3]);
      const control = process([trait('weapon-control', undefined, 'hafted')], [sword, mace], { mainHand: 'sword', offHand: 'mace' });
      expect(control.attacks.map(a => a.fumble)).toEqual([1, 1]);
      const fumbler = process([trait('weapon-control', undefined, 'hafted'), trait('fumbler', 2)], [sword, mace], {
        mainHand: 'sword',
        offHand: 'mace',
      });
      expect(fumbler.attacks.map(a => a.fumble)).toEqual([5, 5]);
    });

    it('great arm lengthens thrown ranges by 25% per tier; nearsighted shortens every ranged attack', () => {
      const dagger = thrownDagger();
      const arm = process([trait('great-arm', 2)], [dagger], { mainHand: 'dagger' });
      expect(arm.attacks[0].ranges!.map(r => r.to)).toEqual([15, 45, 90]);
      const bow = weapon('bow', 'ranged-weapon@bow', ranges);
      expect(process([trait('great-arm', 2)], [bow], { mainHand: 'bow' }).attacks[0].ranges!.map(r => r.to)).toEqual([10, 30, 60]);
      expect(process([trait('nearsighted', 1)], [bow], { mainHand: 'bow' }).attacks[0].ranges!.map(r => r.to)).toEqual([8, 24, 48]);
    });
  });
});
