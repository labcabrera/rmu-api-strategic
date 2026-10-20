import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';
import { CharacterProcessorService } from 'src/modules/characters/domain/services/character-processor.service';
import { AttackProcessor } from 'src/modules/characters/domain/services/character/processors/attack-processor';
import { DefenseProcessor } from 'src/modules/characters/domain/services/character/processors/defense-processor';
import { EquipmentProcessor } from 'src/modules/characters/domain/services/character/processors/equipment-processor';
import { HPProcessor } from 'src/modules/characters/domain/services/character/processors/hp-processor';
import { InitiativeProcessor } from 'src/modules/characters/domain/services/character/processors/initiative-processor';
import { MovementProcessor } from 'src/modules/characters/domain/services/character/processors/movement-processor';
import { PowerProcessor } from 'src/modules/characters/domain/services/character/processors/power-processor';
import { ResistancesProcessor } from 'src/modules/characters/domain/services/character/processors/resistances-processor';
import { SkillProcessor } from 'src/modules/characters/domain/services/character/processors/skill-processor';
import { StatProcessor } from 'src/modules/characters/domain/services/character/processors/stat-processor';
import { XPProcessor } from 'src/modules/characters/domain/services/character/processors/xp-processor';
import { CharacterTrait } from 'src/modules/characters/domain/value-objects/character-trait.vo';
import { TRAIT_EFFECTS } from 'src/modules/characters/domain/services/character/traits/trait-effects.registry';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { ItemWeaponRange } from 'src/modules/items/domain/value-objects/item-weapon-range.vo';
import { armor, buildCharacter, shield, skill, trait, weapon } from './character.fixture';

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

const SKILLS = () => [
  skill('perception', 'sight', 2),
  skill('perception', 'hearing', 1),
  skill('body-development', null, 3),
  skill('acrobatics'),
  skill('climbing'),
  skill('jumping'),
  skill('running'),
  skill('navigation'),
  skill('leadership'),
  skill('music', 'flute'),
  skill('music', 'harp'),
  skill('survival', 'forest'),
  skill('endurance'),
  skill('melee-weapon', 'blade', 2),
  skill('melee-weapon', 'hafted', 2),
  skill('ranged-weapon', 'bow', 2),
  skill('ranged-weapon', 'crossbow', 2),
  skill('shield', null, 1),
];

const process = (traits: CharacterTrait[], items: Item[] = [], slots: Record<string, string | null> = {}, racialAt = 1): Character => {
  const character = buildCharacter({ traits, skills: SKILLS(), slots, racialAt });
  processor.process(character, items);
  return character;
};

const findSkill = (character: Character, skillId: string, specialization: string | null = null) =>
  character.skills.find(s => s.skillId === skillId && s.specialization === specialization)!;

const resistance = (character: Character, id: string) => character.resistances.find(r => r.resistance === id)!;

describe('Trait effects on the character sheet', () => {
  const baseline = process([]);

  it('has a registry entry for every talent of spec 008', () => {
    expect(Object.keys(TRAIT_EFFECTS).sort()).toEqual(
      [
        'fast-attack',
        'superior-stat',
        'inferior-stat',
        'prodigy',
        'inept',
        'tough',
        'fragile',
        'recurved-musculature',
        'wings-vestigial',
        'direction-sense',
        'look-of-eagles',
        'perfect-pitch',
        'physical-resistance',
        'physical-vulnerability',
        'magical-resistance',
        'magical-vulnerability',
        'iron-will',
        'defensive-aura',
        'natural-armor',
        'increased-stride',
        'decreased-stride',
        'ambidextrous',
        'one-eye',
        'deadeye',
        'enhanced-attack',
        'lesser-attack',
      ].sort(),
    );
  });

  it('leaves the sheet without trait bonuses when there are no traits', () => {
    expect(baseline.skills.every(s => s.traitBonus === 0)).toBe(true);
    expect(baseline.resistances.every(r => r.traitBonus === 0)).toBe(true);
    expect(baseline.initiative.modifiers.trait).toBeUndefined();
    expect(baseline.statistics.st.modifiers.trait).toBeUndefined();
    expect(baseline.movement.modifiers.trait).toBeUndefined();
    expect(baseline.defense.modifiers).toEqual({});
  });

  describe('initiative', () => {
    it('fast-attack adds 5 per tier', () => {
      const character = process([trait('fast-attack', 2)]);
      expect(character.initiative.modifiers.trait).toBe(10);
      expect(character.initiative.totalBonus).toBe(baseline.initiative.totalBonus + 10);
    });
  });

  describe('statistics', () => {
    it('superior-stat adds 1 per tier to the chosen stat', () => {
      const character = process([trait('superior-stat', 3, 'st')]);
      expect(character.statistics.st.modifiers.trait).toBe(3);
      expect(character.statistics.st.totalBonus).toBe(baseline.statistics.st.totalBonus + 3);
      expect(character.statistics.ag.modifiers.trait).toBeUndefined();
    });

    it('inferior-stat removes 1 per tier from the chosen stat', () => {
      const character = process([trait('inferior-stat', 2, 'qu')]);
      expect(character.statistics.qu.modifiers.trait).toBe(-2);
      expect(character.statistics.qu.totalBonus).toBe(baseline.statistics.qu.totalBonus - 2);
    });

    it('removes the stat trait modifier when the trait is gone', () => {
      const character = process([trait('superior-stat', 3, 'st')]);
      character.traits = [];
      processor.process(character, []);
      expect(character.statistics.st.modifiers.trait).toBeUndefined();
      expect(character.statistics.st.totalBonus).toBe(baseline.statistics.st.totalBonus);
    });
  });

  describe('skills', () => {
    it('prodigy without specialization applies to every specialization of the skill', () => {
      const character = process([trait('prodigy', 2, 'perception')]);
      ['sight', 'hearing'].forEach(spec => {
        expect(findSkill(character, 'perception', spec).traitBonus).toBe(10);
        expect(findSkill(character, 'perception', spec).totalBonus).toBe(findSkill(baseline, 'perception', spec).totalBonus + 10);
      });
      expect(findSkill(character, 'perception', 'sight').customBonus).toBe(0);
    });

    it('prodigy with a specialization applies only to that specialization', () => {
      const character = process([trait('prodigy', 1, 'perception@sight')]);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(5);
      expect(findSkill(character, 'perception', 'hearing').traitBonus).toBe(0);
    });

    it('prodigy on a skill without specializations', () => {
      const character = process([trait('prodigy', 3, 'navigation')]);
      expect(findSkill(character, 'navigation').traitBonus).toBe(15);
    });

    it('prodigy on a race skill id (survival) applies to its specializations', () => {
      const character = process([trait('prodigy', 2, 'survival', 'race')]);
      expect(findSkill(character, 'survival', 'forest').traitBonus).toBe(10);
    });

    it('prodigy on a weapon skill', () => {
      const character = process([trait('prodigy', 1, 'melee-weapon@blade')]);
      expect(findSkill(character, 'melee-weapon', 'blade').traitBonus).toBe(5);
      expect(findSkill(character, 'melee-weapon', 'hafted').traitBonus).toBe(0);
    });

    it('inept removes 5 per tier with the same matching rules', () => {
      const character = process([trait('inept', 2, 'perception'), trait('inept', 1, 'music@harp')]);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(-10);
      expect(findSkill(character, 'perception', 'hearing').traitBonus).toBe(-10);
      expect(findSkill(character, 'music', 'harp').traitBonus).toBe(-5);
      expect(findSkill(character, 'music', 'flute').traitBonus).toBe(0);
    });

    it('inept on a specialization the character does not have is ignored', () => {
      const character = process([trait('inept', 5, 'endurance@swimming', 'race')]);
      expect(findSkill(character, 'endurance').traitBonus).toBe(0);
    });

    it('tough adds 5 per tier to body development and the hit points', () => {
      const character = process([trait('tough', 3)]);
      expect(findSkill(character, 'body-development').traitBonus).toBe(15);
      expect(character.hp.max).toBe(baseline.hp.max + 15);
    });

    it('fragile removes 5 per tier from body development', () => {
      const character = process([trait('fragile', 2)]);
      expect(findSkill(character, 'body-development').traitBonus).toBe(-10);
    });

    it('recurved-musculature adds 20 to acrobatics, climbing, jumping and running', () => {
      const character = process([trait('recurved-musculature')]);
      ['acrobatics', 'climbing', 'jumping', 'running'].forEach(id => expect(findSkill(character, id).traitBonus).toBe(20));
      expect(findSkill(character, 'navigation').traitBonus).toBe(0);
    });

    it('wings-vestigial adds 10 to jumping', () => {
      const character = process([trait('wings-vestigial')]);
      expect(findSkill(character, 'jumping').traitBonus).toBe(10);
      expect(findSkill(character, 'acrobatics').traitBonus).toBe(0);
    });

    it('direction-sense adds 30 to navigation', () => {
      const character = process([trait('direction-sense')]);
      expect(findSkill(character, 'navigation').traitBonus).toBe(30);
    });

    it('look-of-eagles adds 10 per tier to leadership', () => {
      const character = process([trait('look-of-eagles', 2)]);
      expect(findSkill(character, 'leadership').traitBonus).toBe(20);
    });

    it('perfect-pitch adds 10 per tier to every music specialization', () => {
      const character = process([trait('perfect-pitch', 1)]);
      expect(findSkill(character, 'music', 'flute').traitBonus).toBe(10);
      expect(findSkill(character, 'music', 'harp').traitBonus).toBe(10);
    });
  });

  describe('resistances', () => {
    it('physical-resistance adds 5 per tier to the physical RR', () => {
      const character = process([trait('physical-resistance', 2)]);
      expect(resistance(character, 'physical').traitBonus).toBe(10);
      expect(resistance(character, 'physical').totalBonus).toBe(resistance(baseline, 'physical').totalBonus + 10);
    });

    it('physical-vulnerability removes 5 per tier from the physical RR', () => {
      const character = process([trait('physical-vulnerability', 1)]);
      expect(resistance(character, 'physical').traitBonus).toBe(-5);
    });

    it('magical-resistance adds 5 per tier to the chosen realm RR', () => {
      const character = process([trait('magical-resistance', 2, 'essence')]);
      expect(resistance(character, 'essence').traitBonus).toBe(10);
      expect(resistance(character, 'channeling').traitBonus).toBe(0);
      expect(resistance(character, 'mentalism').traitBonus).toBe(0);
    });

    it('magical-vulnerability removes 5 per tier from the chosen realm RR', () => {
      const character = process([trait('magical-vulnerability', 3, 'channeling')]);
      expect(resistance(character, 'channeling').traitBonus).toBe(-15);
      expect(resistance(character, 'essence').traitBonus).toBe(0);
    });

    it('iron-will adds 5 per tier to the mentalism RR', () => {
      const character = process([trait('iron-will', 2)]);
      expect(resistance(character, 'mentalism').traitBonus).toBe(10);
      expect(resistance(character, 'fear').traitBonus).toBe(0);
    });
  });

  describe('defense', () => {
    it('defensive-aura adds 5 per tier to the DB', () => {
      const character = process([trait('defensive-aura', 2)]);
      expect(character.defense.modifiers['defensive-aura']).toBe(10);
      expect(character.defense.defensiveBonus).toBe(baseline.defense.defensiveBonus + 10);
    });

    it('natural-armor sets the unarmored AT to 1 + tier', () => {
      const character = process([trait('natural-armor', 3)]);
      expect(character.defense.armor.at).toBe(4);
      expect(character.defense.modifiers['natural-armor']).toBeUndefined();
    });

    it('natural-armor never lowers a higher racial AT', () => {
      const character = process([trait('natural-armor', 1)], [], {}, 5);
      expect(character.defense.armor.at).toBe(5);
    });

    it('natural-armor keeps the natural AT where the worn armor is lighter', () => {
      const items = [armor('helmet', 'head', 2)];
      const character = process([trait('natural-armor', 4)], items, { head: 'helmet' });
      expect(character.defense.armor.at).toBe(5);
      expect(character.defense.modifiers['natural-armor']).toBeUndefined();
    });

    it('natural-armor uses the worn armor where it is heavier and adds the tiers as DB for body armor', () => {
      const items = [armor('plate', 'body', 17), armor('helmet', 'head', 2)];
      const character = process([trait('natural-armor', 2)], items, { body: 'plate', head: 'helmet' });
      expect(character.defense.armor.bodyAt).toBe(17);
      expect(character.defense.armor.headAt).toBe(3);
      expect(character.defense.armor.armsAt).toBe(3);
      expect(character.defense.armor.legsAt).toBe(3);
      expect(character.defense.modifiers['natural-armor']).toBe(2);
      expect(character.defense.defensiveBonus).toBe(baseline.defense.defensiveBonus + 2);
    });

    it('natural-armor does not change the maneuver penalty', () => {
      const character = process([trait('natural-armor', 5)]);
      expect(character.equipment.maneuverPenalty).toBe(baseline.equipment.maneuverPenalty);
    });

    it('keeps the worn armor without natural armor', () => {
      const items = [armor('helmet', 'head', 2)];
      const character = process([], items, { head: 'helmet' }, 3);
      expect(character.defense.armor.headAt).toBe(2);
      expect(character.defense.armor.bodyAt).toBe(3);
    });
  });

  describe('movement', () => {
    it('increased-stride adds 2 per tier to the BMR', () => {
      const character = process([trait('increased-stride', 2)]);
      expect(character.movement.modifiers.trait).toBe(4);
      expect(character.movement.baseMovementRate).toBe(baseline.movement.baseMovementRate + 4);
    });

    it('decreased-stride removes 2 per tier from the BMR', () => {
      const character = process([trait('decreased-stride', 1)]);
      expect(character.movement.modifiers.trait).toBe(-2);
      expect(character.movement.baseMovementRate).toBe(baseline.movement.baseMovementRate - 2);
    });
  });

  describe('attacks', () => {
    const ranges = [
      new ItemWeaponRange(0, 10, 0),
      new ItemWeaponRange(11, 30, -10),
      new ItemWeaponRange(31, 60, -25),
      new ItemWeaponRange(61, 100, -40),
    ];
    const sword = weapon('sword', 'melee-weapon@blade');
    const mace = weapon('mace', 'melee-weapon@hafted');
    const bow = weapon('bow', 'ranged-weapon@bow', ranges);
    const crossbow = weapon('crossbow', 'ranged-weapon@crossbow', ranges);

    it('stores the weapon skill id in the attack and shield for shield attacks', () => {
      const character = process([], [sword, shield('shield')], { mainHand: 'sword', offHand: 'shield' });
      expect(character.attacks.map(a => a.skillId)).toEqual(['melee-weapon@blade', 'shield']);
    });

    it('ambidextrous cancels the off-hand penalty only in the off hand', () => {
      const character = process([trait('ambidextrous')], [sword, mace], { mainHand: 'sword', offHand: 'mace' });
      const [main, off] = character.attacks;
      expect(main.boModifiers.ambidextrous).toBeUndefined();
      expect(off.boModifiers.offHand).toBe(-20);
      expect(off.boModifiers.ambidextrous).toBe(20);
      const without = process([], [sword, mace], { mainHand: 'sword', offHand: 'mace' });
      expect(off.bo).toBe(without.attacks[1].bo + 20);
    });

    it('one-eye applies -25 to ranged attacks only', () => {
      const ranged = process([trait('one-eye')], [bow], { mainHand: 'bow' });
      expect(ranged.attacks[0].boModifiers.oneEye).toBe(-25);
      const melee = process([trait('one-eye')], [sword], { mainHand: 'sword' });
      expect(melee.attacks[0].boModifiers.oneEye).toBeUndefined();
    });

    it('deadeye raises each range penalty by 10 per tier up to 0 for its weapon type', () => {
      const character = process([trait('deadeye', 2, 'bow')], [bow], { mainHand: 'bow' });
      expect(character.attacks[0].ranges!.map(r => r.bonus)).toEqual([0, 0, -5, -20]);
      const other = process([trait('deadeye', 2, 'bow')], [crossbow], { mainHand: 'crossbow' });
      expect(other.attacks[0].ranges!.map(r => r.bonus)).toEqual([0, -10, -25, -40]);
    });

    it('enhanced-attack adds one size per tier to attacks of its skill', () => {
      const character = process([trait('enhanced-attack', 2, 'melee-weapon@blade')], [sword, mace], { mainHand: 'sword', offHand: 'mace' });
      expect(character.attacks[0].sizeAdjustment).toBe(2);
      expect(character.attacks[1].sizeAdjustment).toBe(0);
    });

    it('enhanced-attack with a skill id applies to every specialization of the skill', () => {
      const character = process([trait('enhanced-attack', 1, 'melee-weapon')], [sword, mace], { mainHand: 'sword', offHand: 'mace' });
      expect(character.attacks.map(a => a.sizeAdjustment)).toEqual([1, 1]);
    });

    it('lesser-attack removes one size per tier from attacks of its skill', () => {
      const character = process([trait('lesser-attack', 1, 'shield')], [sword, shield('shield')], { mainHand: 'sword', offHand: 'shield' });
      expect(character.attacks[0].sizeAdjustment).toBe(0);
      expect(character.attacks[1].sizeAdjustment).toBe(-1);
    });
  });

  describe('duplicated traits', () => {
    it('applies only the highest tier when the trait comes from the race and the character', () => {
      const character = process([trait('prodigy', 2, 'perception', 'race'), trait('prodigy', 3, 'perception')]);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(15);
    });

    it('applies the same trait with different specializations independently', () => {
      const character = process([trait('prodigy', 2, 'perception'), trait('prodigy', 1, 'navigation')]);
      expect(findSkill(character, 'perception', 'sight').traitBonus).toBe(10);
      expect(findSkill(character, 'navigation').traitBonus).toBe(5);
    });
  });
});
