import type { ItemResponse } from '../../../../src/modules/items/application/ports/item-client.port.js';
import type { TreasureTables } from '../../../../src/modules/items/domain/value-objects/treasure-tables.vo.js';
import type { Dice } from '../../../../src/modules/treasure/domain/services/dice.js';
import {
  parseTreasureCodes,
  type TreasureCatalog,
  TreasureGenerator,
  type TreasureItemLine,
} from '../../../../src/modules/treasure/domain/services/treasure-generator.js';
import { RollTreasureHandler } from '../../../../src/modules/treasure/application/cqrs/handlers/treasure.handlers.js';

/** Dice that answer the given numbers in order, and record the ranges asked. */
class FixedDice implements Dice {
  readonly asked: [number, number][] = [];
  constructor(private readonly values: number[]) {}
  roll(min: number, max: number): number {
    this.asked.push([min, max]);
    const value = this.values.shift();
    if (value === undefined) throw new Error(`No more dice for ${min}-${max}`);
    return value;
  }
}

const all = <T>(value: T) => ({ 'very-poor': value, poor: value, normal: value, rich: value, 'very-rich': value });

// Invented tables (workspace spec 067): ranges, values and keys are not the rulebook ones
const TABLES = {
  codes: { wealth: { a: 'poor', c: 'normal' }, lifestyle: { n: 'normal' }, magic: { x: 'normal', u: 'very-poor' } },
  wealthRolls: [
    { min: 1, max: 50, rolls: 1 },
    { min: 51, max: 100, rolls: 2 },
  ],
  wealthValue: [
    { min: -999, max: 50, valueMin: 10, valueMax: 10 },
    { min: 51, max: 999, valueMin: 20, valueMax: 40 },
  ],
  wealthValueModifiers: [{ key: 'power-heroic', value: 15 }],
  wealthType: [
    { min: 1, max: 25, type: 'coins', multiplier: 1 },
    { min: 26, max: 50, type: 'gems', multiplier: 2 },
    { min: 51, max: 75, type: 'jewelry', multiplier: 10 },
    { min: 76, max: 100, type: 'art', multiplier: 3 },
  ],
  wealthMultipliers: { 'very-poor': 0.01, poor: 0.1, normal: 1, rich: 10, 'very-rich': 100 },
  jewelryTypes: [{ min: 1, max: 100, itemTypeId: 'e2e-ring' }],
  artTypes: [{ min: 1, max: 100, key: 'statuette' }],
  gearQuality: [{ min: 1, max: 100, ...all({ total: 15, max: 5 }) }],
  magicTreasure: [
    { min: 1, max: 50, ...all<number[]>([]) },
    { min: 51, max: 90, ...all([0]) },
    { min: 91, max: 100, ...all([-200, 250]) },
  ],
  magicMaxLevel: { 'very-poor': 5, poor: 10, normal: 20, rich: 30, 'very-rich': null },
  itemType: [
    { min: 1, max: 40, table: 'melee' },
    { min: 41, max: 70, table: 'utility' },
    { min: 71, max: 100, table: 'charged' },
  ],
  magicTables: {
    melee: [
      { min: 1, max: 20, label: 'E2E named blade', price: { min: 100, max: 100 }, itemTypeId: 'e2e-named-blade' },
      {
        min: 21,
        max: 40,
        label: 'E2E slayer',
        price: { min: 300, max: 300 },
        generic: {
          base: 'weapon',
          kind: 'weapon',
          bonuses: [
            { kind: 'ob', value: 10 },
            { kind: 'ob', value: 20, against: 'random' },
          ],
        },
      },
      {
        min: 41,
        max: 60,
        label: 'E2E darts',
        price: { min: 50, max: 50 },
        generic: { base: 'missile', kind: 'weapon', bonuses: [{ kind: 'ob', value: 5 }] },
      },
      { min: 61, max: 299, label: 'E2E lost item', price: { min: 10, max: 10 }, itemTypeId: 'e2e-missing' },
      { min: 300, max: 300, label: 'E2E top', price: { min: 1, max: 1 } },
    ],
    utility: [
      {
        min: 1,
        max: 300,
        label: 'E2E potion',
        price: { min: 20, max: 40 },
        generic: {
          base: 'potion',
          baseItemTypeId: 'e2e-potion',
          kind: 'potion',
          bonuses: [],
          spell: { levelMin: 3, levelMax: 3, use: 'single-use' },
        },
      },
    ],
    charged: [
      {
        min: 1,
        max: 300,
        label: 'E2E wand',
        price: { min: 80, max: 80 },
        generic: {
          base: 'spell-item',
          baseItemTypeId: 'e2e-wand',
          kind: 'charged',
          bonuses: [],
          spell: { levelMin: 1, levelMax: 1, use: 'charges', charges: 10, listCode: 'e2e-runes', names: ['Rune A', 'Rune B'] },
        },
      },
    ],
    armor: [],
    ranged: [],
    spell: [],
  },
  randomWeapons: {
    table: [{ min: 1, max: 100, group: 'blades' }],
    size: [
      { min: 1, max: 90, size: 'medium' },
      { min: 91, max: 100, size: 'large' },
    ],
    groups: {
      blades: [{ min: 1, max: 100, itemTypeId: 'e2e-sword' }],
      missile: [{ min: 1, max: 100, itemTypeId: 'e2e-dart', missile: true }],
    },
  },
  creatureTypes: [{ min: 1, max: 100, key: 'undead' }],
  randomArmor: [{ min: 1, max: 100, itemTypeId: 'e2e-plate', at: 8 }],
  randomSpells: {
    realm: [
      { min: 1, max: 50, realm: 'essence' },
      { min: 51, max: 100, realm: 'channeling' },
    ],
    lists: {
      essence: [{ min: 1, max: 100, listCode: 'e2e-open' }],
      channeling: [{ min: 1, max: 100, listCode: null }],
    },
  },
  gems: {
    precious: { columns: [{ min: 10, max: 1000, rows: [{ min: 1, max: 100, itemTypeId: 'e2e-gem' }] }] },
    semiPrecious: { columns: [{ min: 0, max: 9.99, rows: [{ min: 1, max: 100, itemTypeId: 'e2e-stone' }] }] },
  },
  standardPricing: {} as TreasureTables['standardPricing'],
} as unknown as TreasureTables;

const type = (id: string, values: Partial<ItemResponse> = {}): ItemResponse => ({
  id,
  name: `E2E ${id}`,
  category: 'equipment',
  weapon: null,
  armor: null,
  shield: null,
  info: { cost: null, length: null, strength: null, weight: 1, productionHours: undefined, stackable: false },
  ...values,
});

const TYPES: Record<string, ItemResponse> = {
  'e2e-gem': type('e2e-gem', { category: 'gem', features: { gem: { grade: 'precious', mineral: 'x', valuePerCarat: 3 } } }),
  'e2e-stone': type('e2e-stone', { category: 'gem', features: { gem: { grade: 'semi-precious', mineral: 'y', valuePerCarat: 0.5 } } }),
  'e2e-ring': type('e2e-ring', {
    category: 'jewelry',
    features: { jewelry: { value: { min: 10, max: 20, dice: null, openEnded: false }, slot: null } },
  }),
  'e2e-named-blade': type('e2e-named-blade', {
    category: 'weapon',
    features: {
      magic: {
        itemLevel: 25,
        kind: 'weapon',
        days: 1,
        standardPrice: 70,
        basePrice: 10,
        attunement: false,
        charges: null,
        realm: null,
        bonuses: [],
        spells: [],
        section: null,
      },
    },
  }),
  'e2e-sword': type('e2e-sword', { category: 'weapon' }),
  'e2e-dart': type('e2e-dart', {
    category: 'ammunition',
    info: { cost: null, length: null, strength: null, weight: 0.1, productionHours: undefined, stackable: true },
  }),
  'e2e-potion': type('e2e-potion', {
    category: 'potion',
    info: { cost: null, length: null, strength: null, weight: 0.1, productionHours: undefined, stackable: true },
  }),
  'e2e-wand': type('e2e-wand', { category: 'spell-item' }),
};

const catalog: TreasureCatalog = {
  itemType: id => Promise.resolve(TYPES[id]),
  spells: (listCode, level) =>
    Promise.resolve(
      listCode === 'e2e-open'
        ? [
            { name: `E2E spell ${level}a`, level },
            { name: `E2E spell ${level}b`, level },
          ]
        : [],
    ),
};

const generate = (dice: number[], codes: Partial<{ wealth: string[]; lifestyle: string[]; magic: string[] }>, wealthModifier = 0) => {
  const fixed = new FixedDice(dice);
  const generator = new TreasureGenerator(TABLES, catalog, fixed);
  return {
    fixed,
    result: generator.generate({
      codes: { wealth: [], lifestyle: [], magic: [], ...codes } as never,
      wealthModifier,
    }),
  };
};

describe('TreasureGenerator (workspace spec 067, decisions 10-15)', () => {
  it('reads the codes of the book: repeated codes, specials, "-", unknown codes and letters without commas', () => {
    expect(parseTreasureCodes('c, n, x', TABLES.codes).codes).toEqual({ wealth: ['normal'], lifestyle: ['normal'], magic: ['normal'] });
    const parsed = parseTreasureCodes('a, a, x; Special (lair), -, q', TABLES.codes);
    expect(parsed.codes).toEqual({ wealth: ['poor', 'poor'], lifestyle: [], magic: ['normal'] });
    expect(parsed.notes).toEqual(['special (lair)', 'treasure-no-treasure']);
    expect(parsed.warnings).toEqual(['treasure-special-code: special (lair)', 'treasure-unknown-code: q']);
    expect(parseTreasureCodes('c n x', TABLES.codes).codes.magic).toEqual(['normal']);
    expect(parseTreasureCodes(null, TABLES.codes).codes).toEqual({ wealth: [], lifestyle: [], magic: [] });
  });

  it('adds the power level modifier of 7-1c to the given one', () => {
    expect(RollTreasureHandler.wealthModifier(5, 'heroic', TABLES)).toBe(20);
    expect(RollTreasureHandler.wealthModifier(undefined, 'epic', TABLES)).toBe(0);
  });

  it('turns wealth into coins in gold, with every die and the quality multiplier', async () => {
    // 7-1b 10 → 1 roll; 7-1c 60 + 5 = 65 → 20-40, rolled 30; type 10 → coins x1; poor x0.1 → 3 sp = 0.3 gp
    const { result } = generate([10, 60, 30, 10], { wealth: ['poor'] }, 5);
    const roll = await result;
    expect(roll.lines).toEqual([
      {
        kind: 'gold',
        gold: 0.3,
        dice: [
          { table: '7-1b', roll: 10, modifier: 0, total: 10, result: 'poor: 1' },
          { table: '7-1c', roll: 60, modifier: 5, total: 65, result: '20-40' },
          { table: '7-1c-value', roll: 30, modifier: 0, total: 30, result: '30' },
          { table: '7-1c-type', roll: 10, modifier: 0, total: 10, result: 'coins x1' },
        ],
      },
    ]);
  });

  it('rolls a precious gem at 10 sp or more and a semi-precious one below, with carats to 0.01', async () => {
    // 7-1b 60 → 2 rolls. First: value 10, gems x2 → 20 sp (precious): 2 gp / 3 per carat = 0.67 ct
    // Second (poor? no, normal): value 10, gems x2 → 20 sp again
    const precious = await generate([10, 1, 30, 50], { wealth: ['normal'] }).result;
    expect(precious.lines[0]).toMatchObject({ kind: 'item', itemTypeId: 'e2e-gem', value: 2, carats: 0.67 });
    // poor: 10 x 2 x 0.1 = 2 sp → semi-precious: 0.2 gp / 0.5 = 0.4 ct
    const semi = await generate([10, 1, 30, 50], { wealth: ['poor'] }).result;
    expect(semi.lines[0]).toMatchObject({ kind: 'item', itemTypeId: 'e2e-stone', value: 0.2, carats: 0.4 });
  });

  it('gives a jewel the class of highest factor that keeps its base value in the range of its type', async () => {
    // 10 x 10 = 100 sp = 10 gp: fine (x1) → base 10, in 10-20
    const roll = await generate([10, 1, 60, 5], { wealth: ['normal'] }).result;
    expect(roll.lines[0]).toMatchObject({ kind: 'item', itemTypeId: 'e2e-ring', value: 10, jewelryClass: 'fine' });
    expect(TreasureGenerator.jewelryClass(1.5, { min: 10, max: 20 })).toBe('quality');
    expect(TreasureGenerator.jewelryClass(150, { min: 10, max: 20 })).toBe('extravagant');
    expect(TreasureGenerator.jewelryClass(5000, { min: 10, max: 20 })).toBe('quality');
  });

  it('makes art a generic art object named by its type', async () => {
    const roll = await generate([10, 1, 80, 5], { wealth: ['normal'] }).result;
    expect(roll.lines[0]).toMatchObject({ kind: 'item', itemTypeId: 'art-object', name: 'Statuette', value: 3 });
  });

  it('shows the gear quality of a lifestyle code as a note', async () => {
    const roll = await generate([42], { lifestyle: ['normal'] }).result;
    expect(roll.lines).toEqual([
      {
        kind: 'note',
        text: 'treasure-lifestyle: normal +15 / max +5',
        dice: [{ table: '7-1f', roll: 42, modifier: 0, total: 42, result: '+15 / max +5' }],
      },
    ]);
  });

  it('finds a named item of the compendium by its id', async () => {
    // 7-1g 60 → [0]; 7-1h 10 → melee; 15 → named blade (level 25 ≤ 35 of very-rich? normal is 20: see the reroll test)
    const roll = await generate([60, 10, 15], { magic: ['rich'] }).result;
    expect(roll.lines).toEqual([expect.objectContaining({ kind: 'item', itemTypeId: 'e2e-named-blade', value: 70, magic: null })]);
    expect(roll.warnings).toEqual([]);
  });

  it('rolls again an item above the level of its code, up to 3 times, and then keeps it with a warning', async () => {
    const roll = await generate([60, 10, 15, 10, 15, 10, 15, 10, 15], { magic: ['normal'] }).result;
    expect(roll.lines).toHaveLength(1);
    expect((roll.lines[0] as TreasureItemLine).dice.filter(die => die.table === '7-1h')).toHaveLength(4);
    expect(roll.warnings).toEqual(['treasure-level-above-max: E2E e2e-named-blade 25 > 20']);
    // A reroll that falls under the level is kept without a warning
    const kept = await generate([60, 10, 15, 41, 5, 10, 10, 1, 30], { magic: ['normal'] }).result;
    expect(kept.lines[0]).toMatchObject({ itemTypeId: 'e2e-potion' });
    expect(kept.warnings).toEqual([]);
  });

  it('resolves a generic weapon: random base, size and a bonus against a creature type of 7-1k', async () => {
    // 7-1g [0]; 7-1h melee; 30 → slayer; 7-1j group 50, weapon 50, size 95 → large; 7-1k 10 → undead
    const roll = await generate([60, 10, 30, 50, 50, 95, 10], { magic: ['normal'] }).result;
    const line = roll.lines[0] as TreasureItemLine;
    expect(line).toMatchObject({ kind: 'item', itemTypeId: 'e2e-sword', name: 'E2E slayer', size: 'large', value: 30, amount: null });
    expect(line.magic).toMatchObject({
      baseItemTypeId: 'e2e-sword',
      kind: 'weapon',
      price: 30,
      bonuses: [
        { kind: 'ob', value: 10, target: null, against: null },
        { kind: 'ob', value: 20, target: null, against: 'undead' },
      ],
    });
    expect(line.dice.find(die => die.table === '7-1k')?.result).toBe('treasure-creature-undead');
  });

  it('gives a missile 2d10 units', async () => {
    // melee 50 → darts: missile group, weapon 5, size 5; 2d10 = 4 + 7
    const roll = await generate([60, 10, 50, 5, 5, 4, 7], { magic: ['normal'] }).result;
    expect(roll.lines[0]).toMatchObject({ itemTypeId: 'e2e-dart', amount: 11, value: 5 });
  });

  it('resolves the spell of a potion on 7-1r and rmu-api-spells, or names it from the row', async () => {
    // utility: price 20-40 rolled 25; level 3; realm 10 → essence; list 10 → e2e-open; 2 spells → pick 2
    const potion = await generate([60, 50, 10, 10, 10, 2, 25], { magic: ['normal'] }).result;
    expect(potion.lines[0]).toMatchObject({
      itemTypeId: 'e2e-potion',
      amount: 1,
      value: 2.5,
      magic: { kind: 'potion', itemLevel: 3, spells: [{ name: 'E2E spell 3b', level: 3, list: 'e2e-open', use: 'single-use' }] },
    });
    // charged: a fixed list with names, 10 charges
    const wand = await generate([60, 80, 10, 1], { magic: ['normal'] }).result;
    expect(wand.lines[0]).toMatchObject({
      itemTypeId: 'e2e-wand',
      value: 8,
      magic: { kind: 'charged', charges: 10, spells: [{ name: 'Rune A', level: 1, list: 'e2e-runes', use: 'charges' }] },
    });
  });

  it('leaves a line it cannot resolve as a note: an unknown type, an "other" list, a row without item', async () => {
    const missing = await generate([60, 10, 100], { magic: ['normal'] }).result;
    expect(missing.lines).toEqual([expect.objectContaining({ kind: 'note', text: 'E2E lost item' })]);
    expect(missing.warnings).toEqual(['treasure-unresolved: E2E lost item']);
    // realm 60 → channeling → other list
    const other = await generate([60, 50, 10, 60, 10], { magic: ['normal'] }).result;
    expect(other.lines).toEqual([expect.objectContaining({ kind: 'note', text: 'E2E potion' })]);
  });

  it('gives no item for a total below 1 and counts a total above 300 as 300', async () => {
    // 7-1g 95 → [-200, 250]: 7-1h melee, 50 - 200 < 1; then 7-1h melee, 100 + 250 → 300 (a row without item)
    const roll = await generate([95, 10, 50, 10, 100], { magic: ['normal'] }).result;
    expect(roll.lines.map(line => (line.kind === 'note' ? line.text : line.kind))).toEqual(['treasure-no-item', 'E2E top']);
    const top = roll.lines[1].dice.find(die => die.table === 'magic-melee');
    expect(top).toMatchObject({ roll: 100, modifier: 250, total: 300 });
  });

  it('says so when a magic code gives no item', async () => {
    const roll = await generate([10], { magic: ['normal'] }).result;
    expect(roll.lines).toEqual([expect.objectContaining({ kind: 'note', text: 'treasure-no-magic' })]);
  });
});
