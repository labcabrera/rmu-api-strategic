import { Character } from '../../../../src/modules/characters/domain/aggregates/character.js';
import { AttackProcessor } from '../../../../src/modules/characters/domain/services/character/processors/attack-processor.js';
import { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import { ItemWeapon } from '../../../../src/modules/items/domain/value-objects/item-weapon.vo.js';
import { ItemWeaponMode } from '../../../../src/modules/items/domain/value-objects/item-weapon-mode.vo.js';

const SKILL_BONUS = 30;

const buildCharacter = (sizeId: string, slots: Record<string, string | null>): Character =>
  ({
    id: 'character-001',
    info: { sizeId, height: 1.8 },
    equipment: { slots },
    skills: [],
    traits: [],
    findSkill: () => ({ totalBonus: SKILL_BONUS, ranks: 0 }),
  }) as unknown as Character;

const mode = (type: string, sizeAdjustment: number): ItemWeaponMode =>
  new ItemWeaponMode(type, ['melee'], 'table', 'fumble-table', sizeAdjustment, null);

const buildWeapon = (id: string, itemTypeId: string, modes: ItemWeaponMode[], wielderSize?: string): Item =>
  ({
    id,
    itemTypeId,
    info: { length: 1 },
    weapon: new ItemWeapon('melee-weapons@blade', 3, modes, wielderSize),
    shield: null,
  }) as unknown as Item;

const generateAttacks = (character: Character, items: Item[]) => {
  new AttackProcessor().process(character, items);
  return character.attacks;
};

describe('AttackProcessor', () => {
  it('marks two-handed modes as twoHanded', () => {
    const item = buildWeapon('item-001', 'greatsword', [mode('two-hands', 1)]);
    const [attack] = generateAttacks(buildCharacter('medium', { mainHand: 'item-001', offHand: null }), [item]);
    expect(attack.twoHanded).toBe(true);
    expect(attack.weaponCategory).toBe('standard');
  });

  it('classifies a dagger as dagger even with a negative size adjustment', () => {
    const item = buildWeapon('item-001', 'dagger', [mode('one-hand', -1)]);
    const [attack] = generateAttacks(buildCharacter('medium', { mainHand: 'item-001', offHand: null }), [item]);
    expect(attack.twoHanded).toBe(false);
    expect(attack.weaponCategory).toBe('dagger');
  });

  it('classifies a weapon with a negative size adjustment as light', () => {
    const item = buildWeapon('item-001', 'short-sword', [mode('one-hand', -1)]);
    const [attack] = generateAttacks(buildCharacter('medium', { mainHand: 'item-001', offHand: null }), [item]);
    expect(attack.weaponCategory).toBe('light');
  });

  it('classifies other weapons and shields as standard', () => {
    const weapon = buildWeapon('item-001', 'broadsword', [mode('one-hand', 0)]);
    const shield = { id: 'item-002', itemTypeId: 'shield', weapon: null, shield: { db: 20, blockCount: 1 } } as unknown as Item;
    const attacks = generateAttacks(buildCharacter('medium', { mainHand: 'item-001', offHand: 'item-002' }), [weapon, shield]);
    expect(attacks.map(a => a.weaponCategory)).toEqual(['standard', 'standard']);
    expect(attacks[1].twoHanded).toBe(false);
    expect(attacks[1].wrongSize).toBe(false);
  });

  it('applies the wrong-size penalty and uses the weapon size for the attack', () => {
    const item = buildWeapon('item-001', 'broadsword', [mode('one-hand', 0)], 'big');
    const [attack] = generateAttacks(buildCharacter('medium', { mainHand: 'item-001', offHand: null }), [item]);
    expect(attack.wrongSize).toBe(true);
    expect(attack.boModifiers.wrongSize).toBe(-20);
    expect(attack.bo).toBe(SKILL_BONUS - 20);
    expect(attack.sizeAdjustment).toBe(1);
  });

  it('does not penalize a weapon made for the wielder size', () => {
    const item = buildWeapon('item-001', 'short-sword', [mode('one-hand', -1)], 'small');
    const [attack] = generateAttacks(buildCharacter('small', { mainHand: 'item-001', offHand: null }), [item]);
    expect(attack.wrongSize).toBe(false);
    expect(attack.boModifiers.wrongSize).toBeUndefined();
    expect(attack.bo).toBe(SKILL_BONUS);
    expect(attack.sizeAdjustment).toBe(-2);
  });
});
