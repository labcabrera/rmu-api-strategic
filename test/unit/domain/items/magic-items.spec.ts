import { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemProps } from '../../../../src/modules/items/domain/aggregates/item-props.js';
import { MagicItemMappings } from '../../../../src/modules/items/domain/services/magic-item-mapping.js';
import { MagicItemPricing } from '../../../../src/modules/items/domain/services/magic-item-pricing.js';
import type { MagicItemFeature } from '../../../../src/modules/items/domain/value-objects/item-catalog-info.vo.js';
import type { StandardPricing } from '../../../../src/modules/items/domain/value-objects/treasure-tables.vo.js';
import { ItemFactory } from '../../../../src/modules/items/application/services/item-factory.service.js';
import { PurchasePricing } from '../../../../src/modules/items/application/services/purchase-pricing.service.js';
import type { ItemResponse } from '../../../../src/modules/items/application/ports/item-client.port.js';
import { ChangeItemChargesHandler } from '../../../../src/modules/items/application/cqrs/handlers/magic-item.handlers.js';
import { SetGemHandler } from '../../../../src/modules/items/application/cqrs/handlers/gem.handlers.js';
import { DomainError } from '../../../../src/modules/shared/domain/errors/errors.js';

// Invented magic blocks, tables and prices (workspace spec 067): not the rulebook ones
const feature = (values: Partial<MagicItemFeature> = {}): MagicItemFeature => ({
  itemLevel: 6,
  kind: 'weapon',
  days: 10,
  standardPrice: 100,
  basePrice: 10,
  attunement: false,
  charges: null,
  realm: null,
  bonuses: [],
  spells: [],
  section: null,
  ...values,
});

const PRICING: StandardPricing = {
  pricePerDay: [
    { ppMin: 0, ppMax: 9, extraSp: 2 },
    { ppMin: 10, ppMax: null, extraSp: 5 },
  ],
  weapon: [{ bonus: 10, days: 20, level: 8, price: 400 }],
  ranged: [],
  armor: [{ at: 8, rows: [{ bonus: 5, days: 10, level: 4, price: 150 }] }],
  shield: [],
  generalBonus: [{ material: 'metal', rows: [{ bonus: 5, days: 4, level: 2, price: 60 }] }],
  powerEnhancers: [],
  daily: [],
  constant: [],
  emplaced: [],
  potions: [],
  charged: [],
};

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return (error as DomainError).code;
  }
  return undefined;
};

const SWORD_TYPE: ItemResponse = {
  id: 'e2e-flame-sword',
  name: 'Flame sword',
  category: 'weapon',
  weapon: { skillId: 'melee-weapon@sword', fumble: 3, modes: [], wielderSize: 'medium' },
  armor: null,
  shield: null,
  features: {
    magic: feature({
      bonuses: [
        { kind: 'ob', value: 15 },
        { kind: 'ob', value: 25, against: 'undead' },
        { kind: 'skill', value: 10, target: 'perception' },
      ],
      spells: [{ name: 'E2E bolt', level: 6, list: 'e2e-list', use: 'charges' }],
      charges: 12,
    }),
  },
  info: { cost: null, length: 1, strength: 20, weight: 3, productionHours: 40, stackable: false },
};

const item = (values: Partial<ItemProps> = {}): Item =>
  Item.fromProps({
    id: 'item-1',
    gameId: 'game-1',
    factionId: 'faction-1',
    characterId: null,
    itemTypeId: 'e2e-gem',
    name: 'Gem',
    category: 'gem',
    carried: false,
    weapon: null,
    armor: null,
    shield: null,
    modifiers: [],
    amount: null,
    info: { length: null, weight: 0.01, strength: null, stackable: false },
    description: null,
    createdAt: new Date(),
    updatedAt: null,
    accessType: 'public',
    owner: 'owner',
    value: 8,
    ...values,
  });

describe('magic items (workspace spec 067)', () => {
  describe('MagicItemMappings', () => {
    it('turns OB into attack and DB or shield into defense, and keeps the other bonuses as properties', () => {
      const mapping = MagicItemMappings.map(
        feature({
          bonuses: [
            { kind: 'ob', value: 10 },
            { kind: 'db', value: 5 },
            { kind: 'shield', value: 3 },
            { kind: 'db', value: 20, against: 'dragon' },
            { kind: 'rr', value: 10, target: 'essence' },
            { kind: 'spell-adder', value: 2 },
          ],
        }),
        'catalog',
        { breakable: true },
      );
      expect(mapping.modifiers.map(m => [m.type, m.appliesTo, m.value, m.source?.kind])).toEqual([
        ['enchantment', 'attack', 10, 'catalog-magic'],
        ['enchantment', 'defense', 5, 'catalog-magic'],
        ['enchantment', 'defense', 3, 'catalog-magic'],
        ['enchantment', 'breakage', 6, 'catalog-magic'],
      ]);
      expect(mapping.enchantment.properties).toEqual([
        { kind: 'db', value: 20, target: null, against: 'dragon' },
        { kind: 'rr', value: 10, target: 'essence' },
        { kind: 'spell-adder', value: 2, target: null },
      ]);
      expect(mapping.enchantment).toMatchObject({ source: 'catalog', projectId: null, itemLevel: 6, kind: 'weapon', attunement: false });
      expect(mapping.charges).toBeNull();
    });

    it('fills the charges, copies the spells and uses the source of a treasure', () => {
      const mapping = MagicItemMappings.map(
        feature({ kind: 'charged', charges: 8, attunement: true, spells: [{ name: 'E2E light', level: 2, list: null, use: 'charges' }] }),
        'treasure',
        { breakable: false },
      );
      expect(mapping.charges).toEqual({ max: 8, current: 8 });
      expect(mapping.modifiers).toEqual([]);
      expect(mapping.enchantment.spells).toEqual([
        { spellId: null, name: 'E2E light', level: 2, listCode: null, use: 'charges', perDay: null },
      ]);
      expect(mapping.enchantment).toMatchObject({ source: 'treasure', attunement: true });
      const manual = MagicItemMappings.map(feature({ bonuses: [{ kind: 'ob', value: 5 }] }), 'manual', { breakable: true });
      expect(manual.modifiers[0].source).toEqual({ kind: 'manual' });
    });

    it('takes the base item out of the standard price', () => {
      expect(MagicItemMappings.enchantmentPart(feature())).toBe(90);
      expect(MagicItemMappings.enchantmentPart(feature({ basePrice: null }))).toBe(100);
      expect(MagicItemMappings.enchantmentPart(feature({ standardPrice: null }))).toBe(0);
      expect(MagicItemMappings.enchantmentPart(null)).toBe(0);
    });
  });

  describe('ItemFactory and purchase pricing', () => {
    const factory = new ItemFactory({} as never, {} as never, {} as never);

    it('builds a magic catalog type with its enchantment, OB modifier and full charges', () => {
      const built = factory.build(SWORD_TYPE, { gameId: 'game-1', holder: { kind: 'faction', id: 'f-1' }, character: null, owner: 'u' });
      expect(built.enchantment).toMatchObject({ source: 'catalog', itemLevel: 6, kind: 'weapon' });
      expect(built.enchantment!.properties.map(p => p.kind)).toEqual(['ob', 'skill']);
      expect(built.modifiers.filter(m => m.type === 'enchantment').map(m => [m.appliesTo, m.value])).toEqual([
        ['attack', 15],
        ['breakage', 6],
      ]);
      expect(built.charges).toEqual({ max: 12, current: 12 });
      // A type without a cost is worth its standard price
      expect(built.value).toBe(100);
    });

    it('takes the magic of the options, or none, and their source', () => {
      const holder = { kind: 'faction' as const, id: 'f-1' };
      const plain = factory.build(SWORD_TYPE, { gameId: 'g', holder, character: null, owner: 'u', magic: null });
      expect(plain.enchantment).toBeNull();
      expect(plain.charges).toBeNull();
      const treasure = factory.build(SWORD_TYPE, { gameId: 'g', holder, character: null, owner: 'u', magicSource: 'treasure' });
      expect(treasure.enchantment?.source).toBe('treasure');
      expect(treasure.modifiers[0].source).toEqual({ kind: 'treasure' });
    });

    it('multiplies only the magic part of the price by the power level (decision 6)', () => {
      const withCost: ItemResponse = { ...SWORD_TYPE, info: { ...SWORD_TYPE.info, cost: { min: 100, average: 100, max: 100 } } };
      expect(PurchasePricing.unitBase(withCost, undefined).unitBase).toBe(100);
      // 10 of the base + 90 x 0.75
      expect(PurchasePricing.unitBase(withCost, undefined, Math.random, null, 0.75).unitBase).toBe(77.5);
      expect(PurchasePricing.unitBase(SWORD_TYPE, undefined, Math.random, null, 1.5).unitBase).toBe(145);
      const plain: ItemResponse = { ...withCost, features: null };
      expect(PurchasePricing.unitBase(plain, undefined, Math.random, null, 0.5).unitBase).toBe(100);
    });
  });

  describe('MagicItemPricing', () => {
    const base = { baseValue: 10, baseAt: null, pricing: PRICING, powerMultiplier: 1 };

    it('prices the spells with the formula of 6-1a: days = levels, price per day = item level + extra sp', () => {
      const quote = MagicItemPricing.quote({
        ...base,
        design: {
          kind: 'daily',
          bonuses: [],
          spells: [
            { name: 'A', level: 3, use: 'daily' },
            { name: 'B', level: 4, use: 'recipe' },
          ],
        },
      });
      // 7 days, PP/day 7 → +2 sp; level 4 → 6 sp/day; 42 sp = 4.2 gp
      expect(quote).toMatchObject({ days: 7, itemLevel: 4, price: 14.2 });
      const big = MagicItemPricing.quote({
        ...base,
        design: { kind: 'daily', itemLevel: 12, bonuses: [], spells: [{ name: 'C', level: 10, use: 'daily' }] },
      });
      // 10 days, PP/day 10 → +5 sp; level 12 → 17 sp/day; 170 sp
      expect(big).toMatchObject({ days: 10, itemLevel: 12, price: 27 });
    });

    it('uses 2 sp + 1 per 40 PP when core has no tables, and the power level on the magic part', () => {
      const quote = MagicItemPricing.quote({
        ...base,
        pricing: null,
        powerMultiplier: 2,
        design: { kind: 'daily', bonuses: [], spells: [{ name: 'A', level: 5, use: 'daily' }] },
      });
      // 5 days x (5 + 2) sp = 35 sp = 3.5 gp x 2
      expect(quote.price).toBe(17);
      expect(quote.breakdown).toContain('power level: x2');
    });

    it('takes a standard enhancement from the tables of chapter 6, adding the spells', () => {
      const weapon = MagicItemPricing.quote({
        ...base,
        design: { kind: 'weapon', bonuses: [], spells: [], standard: { table: 'weapon', bonus: 10 } },
      });
      expect(weapon).toMatchObject({ days: 20, itemLevel: 8, price: 50 });
      const armor = MagicItemPricing.quote({
        ...base,
        baseAt: 8,
        design: { kind: 'armor', bonuses: [], spells: [{ name: 'A', level: 2, use: 'constant' }], standard: { table: 'armor', bonus: 5 } },
      });
      // 150 sp + 2 days x (4 + 2) sp = 162 sp
      expect(armor).toMatchObject({ days: 12, itemLevel: 4, price: 26.2 });
      const general = MagicItemPricing.quote({
        ...base,
        design: { kind: 'general-bonus', bonuses: [], spells: [], standard: { table: 'general-bonus', bonus: 5, material: 'metal' } },
      });
      expect(general.price).toBe(16);
    });

    it('rejects an unknown standard row or missing tables, and an explicit price wins', () => {
      const design = { kind: 'weapon' as const, bonuses: [], spells: [], standard: { table: 'weapon' as const, bonus: 15 } };
      expect(codeOf(() => MagicItemPricing.quote({ ...base, design }))).toBe('err-magic-item-standard-unknown');
      expect(codeOf(() => MagicItemPricing.quote({ ...base, pricing: null, design }))).toBe('err-treasure-tables-missing');
      expect(
        codeOf(() =>
          MagicItemPricing.quote({ ...base, baseAt: 3, design: { ...design, kind: 'armor', standard: { table: 'armor', bonus: 5 } } }),
        ),
      ).toBe('err-magic-item-standard-unknown');
      const asked = MagicItemPricing.quote({ ...base, design: { ...design, standard: { table: 'weapon', bonus: 10 }, price: 33 } });
      expect(asked).toMatchObject({ days: 20, itemLevel: 8, price: 33 });
    });

    it('adds the bonus of a standard enhancement to the magic block unless the design has one', () => {
      const design = { kind: 'weapon' as const, bonuses: [], spells: [], standard: { table: 'weapon' as const, bonus: 10 } };
      const quote = MagicItemPricing.quote({ ...base, design });
      const block = MagicItemPricing.feature(design, quote, 10);
      expect(block).toMatchObject({ itemLevel: 8, days: 20, standardPrice: 50, basePrice: 10, bonuses: [{ kind: 'ob', value: 10 }] });
      const own = MagicItemPricing.feature({ ...design, bonuses: [{ kind: 'ob', value: 12 }] }, quote, 10);
      expect(own.bonuses).toEqual([{ kind: 'ob', value: 12 }]);
    });
  });

  describe('charges, cut and settings of an item', () => {
    it('spends and adds charges within 0 and the maximum, and recharges to the maximum', () => {
      const wand = item({ category: 'spell-item', charges: { max: 5, current: 2 } });
      wand.changeCharges(-2);
      expect(wand.charges).toEqual({ max: 5, current: 0 });
      expect(codeOf(() => wand.changeCharges(-1))).toBe('err-item-charges-invalid');
      expect(codeOf(() => wand.changeCharges(6))).toBe('err-item-charges-invalid');
      expect(codeOf(() => wand.changeCharges(0.5))).toBe('err-item-charges-invalid');
      wand.recharge();
      expect(wand.charges).toEqual({ max: 5, current: 5 });
      expect(codeOf(() => wand.recharge())).toBe('err-item-charges-full');
      expect(codeOf(() => item().changeCharges(1))).toBe('err-item-no-charges');
    });

    it('recharges in as many days as the level of the highest spell', () => {
      const enchantment = MagicItemMappings.map(
        feature({
          itemLevel: 9,
          spells: [
            { name: 'A', level: 3, use: 'charges' },
            { name: 'B', level: 7, use: 'charges' },
          ],
        }),
        'catalog',
        { breakable: false },
      ).enchantment;
      expect(ChangeItemChargesHandler.rechargeDays(item({ enchantment }))).toBe(7);
      expect(ChangeItemChargesHandler.rechargeDays(item({ enchantment: { ...enchantment, spells: [] } }))).toBe(9);
    });

    it('cuts a gem once, multiplying its value', () => {
      const gem = item();
      gem.cut(5);
      expect(gem).toMatchObject({ cutFactor: 5, value: 40 });
      expect(codeOf(() => gem.cut(10))).toBe('err-item-gem-cut');
      expect(codeOf(() => item({ category: 'jewelry' }).cut(5))).toBe('err-item-not-gem');
    });

    it('sets a gem with its magic traits and value, and takes it out again', () => {
      const gem = item({
        carats: 2,
        catalog: {
          cost: null,
          rarity: null,
          productionHours: null,
          imageUrl: null,
          features: {
            gem: { grade: 'precious', mineral: 'x', valuePerCarat: 4, magic: { spells: 'E2E', stats: ['st'], skills: null, other: null } },
          },
        },
      });
      const setting = SetGemHandler.settingOf(gem, new Date('2026-11-02T00:00:00Z'));
      expect(setting).toEqual({
        itemTypeId: 'e2e-gem',
        name: 'Gem',
        carats: 2,
        cutFactor: null,
        value: 8,
        magic: { spells: 'E2E', stats: ['st'], skills: null, other: null },
        setAt: '2026-11-02T00:00:00.000Z',
      });
      const ring = item({ id: 'ring', category: 'jewelry', value: 3 });
      ring.setGem(setting);
      expect(ring.value).toBe(11);
      expect(ring.getProps().settings).toEqual([setting]);
      expect(codeOf(() => gem.setGem(setting))).toBe('err-item-setting-invalid');
      expect(codeOf(() => ring.unsetGem(1))).toBe('err-item-setting-not-found');
      expect(ring.unsetGem(0)).toEqual(setting);
      expect(ring.value).toBe(3);
      expect(ring.getProps().settings).toBeUndefined();
    });
  });
});
