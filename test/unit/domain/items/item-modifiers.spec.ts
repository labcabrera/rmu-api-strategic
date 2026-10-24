import { Character } from '../../../../src/modules/characters/domain/aggregates/character';
import { CharacterProcessorService } from '../../../../src/modules/characters/domain/services/character-processor.service';
import { AttackProcessor } from '../../../../src/modules/characters/domain/services/character/processors/attack-processor';
import { DefenseProcessor } from '../../../../src/modules/characters/domain/services/character/processors/defense-processor';
import { EquipmentProcessor } from '../../../../src/modules/characters/domain/services/character/processors/equipment-processor';
import { HPProcessor } from '../../../../src/modules/characters/domain/services/character/processors/hp-processor';
import { InitiativeProcessor } from '../../../../src/modules/characters/domain/services/character/processors/initiative-processor';
import { MovementProcessor } from '../../../../src/modules/characters/domain/services/character/processors/movement-processor';
import { PowerProcessor } from '../../../../src/modules/characters/domain/services/character/processors/power-processor';
import { ResistancesProcessor } from '../../../../src/modules/characters/domain/services/character/processors/resistances-processor';
import { SkillProcessor } from '../../../../src/modules/characters/domain/services/character/processors/skill-processor';
import { StatProcessor } from '../../../../src/modules/characters/domain/services/character/processors/stat-processor';
import { XPProcessor } from '../../../../src/modules/characters/domain/services/character/processors/xp-processor';
import { Item } from '../../../../src/modules/items/domain/aggregates/item';
import { ItemModifier, ItemModifiers } from '../../../../src/modules/items/domain/value-objects/item-modifier.vo';
import { ValidationError, NotFoundError } from '../../../../src/modules/shared/domain/errors/errors';
import { armor, buildCharacter, shield, skill, weapon } from '../characters/traits/character.fixture';

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

const breakage = (id: string, value: number, broken = false): ItemModifier => ({
  id,
  type: 'breakage',
  value,
  appliesTo: 'all',
  ...(broken ? { broken } : {}),
  createdAt: '2026-10-24T10:00:00.000Z',
});

const withModifiers = (item: Item, modifiers: ItemModifier[]): Item => Object.assign(item, { modifiers });

const process = (items: Item[], slots: Record<string, string | null>): Character => {
  const character = buildCharacter({ skills: [skill('melee-weapon', 'blade', 2), skill('shield', null, 1)], slots });
  processor.process(character, items);
  return character;
};

const buildItem = (modifiers: ItemModifier[] = []): Item =>
  Item.fromProps({
    id: 'item-001',
    gameId: 'game-001',
    factionId: null,
    characterId: 'character-001',
    itemTypeId: 'broadsword',
    name: 'Broadsword',
    category: 'weapon',
    carried: true,
    weapon: null,
    armor: null,
    shield: null,
    modifiers,
    amount: null,
    info: { length: 1, weight: 1, strength: 80, stackable: false },
    description: null,
    createdAt: new Date(),
    updatedAt: null,
    accessType: 'public',
    owner: 'user-001',
  });

describe('ItemModifiers', () => {
  it('derives the condition from the breakage modifiers, never above 0', () => {
    expect(ItemModifiers.condition([])).toEqual({ breakagePenalty: 0, broken: false });
    expect(ItemModifiers.condition([breakage('a', -20), breakage('b', -10)])).toEqual({ breakagePenalty: -30, broken: false });
    expect(ItemModifiers.condition([breakage('a', -5), breakage('b', 10)])).toEqual({ breakagePenalty: 0, broken: false });
    expect(ItemModifiers.condition([breakage('a', 0, true)]).broken).toBe(true);
  });

  it('sums the other modifiers of a use, and those of every use', () => {
    const modifiers: ItemModifier[] = [
      { id: 'q', type: 'quality', value: 10, appliesTo: 'breakage', createdAt: '' },
      { id: 'm', type: 'custom', value: 5, appliesTo: 'all', createdAt: '' },
      { id: 'a', type: 'custom', value: 3, appliesTo: 'attack', createdAt: '' },
      breakage('b', -20),
    ];
    expect(ItemModifiers.bonus(modifiers, 'breakage')).toBe(15);
    expect(ItemModifiers.bonus(modifiers, 'attack')).toBe(8);
  });

  it('an armor piece is unprotected when broken or beyond -50', () => {
    expect(ItemModifiers.isUnprotected({ breakagePenalty: -50, broken: false })).toBe(false);
    expect(ItemModifiers.isUnprotected({ breakagePenalty: -60, broken: false })).toBe(true);
    expect(ItemModifiers.isUnprotected({ breakagePenalty: 0, broken: true })).toBe(true);
  });

  it('rejects invalid modifiers', () => {
    expect(() => ItemModifiers.validate({ ...breakage('a', -20), type: 'magic' as never })).toThrow(ValidationError);
    expect(() => ItemModifiers.validate({ ...breakage('a', -20), appliesTo: 'other' as never })).toThrow(ValidationError);
    expect(() => ItemModifiers.validate({ ...breakage('a', -20), value: Number.NaN })).toThrow(ValidationError);
    expect(() => ItemModifiers.validate({ ...breakage('', -20) })).toThrow(ValidationError);
    expect(() => ItemModifiers.validate({ id: 'q', type: 'quality', value: 5, appliesTo: 'all', broken: true, createdAt: '' })).toThrow(
      ValidationError,
    );
  });
});

describe('Item modifiers', () => {
  it('adds the modifiers it has not yet, leaving out the temporary ones', () => {
    const item = buildItem([breakage('a', -20)]);
    const added = item.addModifiers([breakage('a', -20), breakage('b', -10), { ...breakage('c', -20), temporary: true }]);
    expect(added.map(modifier => modifier.id)).toEqual(['b']);
    expect(item.modifiers.map(modifier => modifier.id)).toEqual(['a', 'b']);
    expect(item.getCondition()).toEqual({ breakagePenalty: -30, broken: false });
    expect(item.getUncommittedEvents()).toHaveLength(1);
  });

  it('adding only known modifiers changes nothing', () => {
    const item = buildItem([breakage('a', -20)]);
    expect(item.addModifiers([breakage('a', -20)])).toEqual([]);
    expect(item.getUncommittedEvents()).toHaveLength(0);
  });

  it('removes a modifier, and rejects an unknown one', () => {
    const item = buildItem([breakage('a', -20)]);
    item.removeModifier('a');
    expect(item.getCondition()).toEqual({ breakagePenalty: 0, broken: false });
    expect(() => item.removeModifier('a')).toThrow(NotFoundError);
  });

  it('reads items stored before modifiers as without them', () => {
    const item = buildItem(undefined);
    expect(item.modifiers).toEqual([]);
  });
});

describe('Breakage on the character sheet', () => {
  it('a damaged weapon lowers its OB by the damage', () => {
    const sword = withModifiers(weapon('item-001', 'melee-weapon@blade'), [breakage('a', -20)]);
    const intact = process([weapon('item-001', 'melee-weapon@blade')], { mainHand: 'item-001' }).attacks[0];
    const [attack] = process([sword], { mainHand: 'item-001' }).attacks;
    expect(attack.boModifiers.breakage).toBe(-20);
    expect(attack.bo).toBe(intact.bo - 20);
    expect(attack.itemId).toBe('item-001');
  });

  it('adds the other attack modifiers of the item', () => {
    const sword = withModifiers(weapon('item-001', 'melee-weapon@blade'), [
      { id: 'm', type: 'custom', value: 5, appliesTo: 'attack', createdAt: '' },
    ]);
    const [attack] = process([sword], { mainHand: 'item-001' }).attacks;
    expect(attack.boModifiers.item).toBe(5);
    expect(attack.boModifiers.breakage).toBeUndefined();
  });

  it('a broken weapon gives no attack', () => {
    const sword = withModifiers(weapon('item-001', 'melee-weapon@blade'), [breakage('a', 0, true)]);
    expect(process([sword], { mainHand: 'item-001' }).attacks).toEqual([]);
  });

  it('a damaged shield lowers its DB, and a broken one gives none', () => {
    const damaged = withModifiers(shield('item-002'), [breakage('a', -10)]);
    expect(process([damaged], { offHand: 'item-002' }).defense.shield?.db).toBe(10);
    const ruined = withModifiers(shield('item-002'), [breakage('a', -30)]);
    expect(process([ruined], { offHand: 'item-002' }).defense.shield?.db).toBe(0);
    const broken = withModifiers(shield('item-002'), [breakage('a', 0, true)]);
    const character = process([broken], { offHand: 'item-002' });
    expect(character.defense.shield).toBeNull();
    expect(character.attacks).toEqual([]);
  });

  it('armor damage is a maneuver penalty, and beyond -50 its area is unprotected', () => {
    const body = withModifiers(armor('item-003', 'body', 10), [breakage('a', -60)]);
    const head = armor('item-004', 'head', 10);
    const character = process([body, head], { body: 'item-003', head: 'item-004' });
    expect(character.equipment.baseManeuverPenalty).toBe(-60);
    expect(character.defense.armor.bodyAt).toBe(1);
    expect(character.defense.armor.headAt).toBe(10);
  });

  it('a broken armor piece leaves its area unprotected', () => {
    const body = withModifiers(armor('item-003', 'body', 10), [breakage('a', 0, true)]);
    expect(process([body], { body: 'item-003' }).defense.armor.at).toBe(1);
  });
});
