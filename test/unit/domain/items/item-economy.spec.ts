import { CraftingOutcomes } from '../../../../src/modules/items/domain/services/crafting-outcome.js';
import { ItemRepair } from '../../../../src/modules/items/domain/services/item-repair.js';
import { DEFAULT_ECONOMY_RULES, PriceCalculator } from '../../../../src/modules/items/domain/services/price-calculator.js';
import type { ItemModifier } from '../../../../src/modules/items/domain/value-objects/item-modifier.vo.js';

const breakage = (value: number, broken = false): ItemModifier => ({
  id: `b${value}${broken ? 'x' : ''}`,
  type: 'breakage',
  value,
  appliesTo: 'all',
  ...(broken ? { broken: true } : {}),
  createdAt: '2026-10-25T00:00:00.000Z',
});
const quality: ItemModifier = { id: 'q', type: 'quality', value: 5, appliesTo: 'attack', createdAt: '2026-10-25T00:00:00.000Z' };

describe('PriceCalculator (spec 023, decision 12)', () => {
  it('limits the Trading percent between 50% and 200%, buying as 200% less the result and selling as the result', () => {
    expect(PriceCalculator.tradingPercent('purchase', 120)).toBe(80);
    expect(PriceCalculator.tradingPercent('purchase', 0)).toBe(200);
    expect(PriceCalculator.tradingPercent('purchase', 175)).toBe(50);
    expect(PriceCalculator.tradingPercent('sale', 120)).toBe(120);
    expect(PriceCalculator.tradingPercent('sale', 10)).toBe(50);
  });

  it('prices a purchase by unit and amount, with three decimals', () => {
    expect(PriceCalculator.purchase(0.1, 3)).toMatchObject({ unitPrice: 0.1, total: 0.3 });
    expect(PriceCalculator.purchase(10, 2, { total: 120, maneuverPercent: 120, pricePercent: 80 })).toMatchObject({
      unitPrice: 8,
      total: 16,
    });
    expect(() => PriceCalculator.purchase(10, 0)).toThrow();
  });

  it('prices a sale by value, sale percent and condition, unless a price is asked', () => {
    const intact = { breakagePenalty: 0, broken: false };
    expect(PriceCalculator.sale(30, 1, intact, DEFAULT_ECONOMY_RULES)).toMatchObject({ condition: 'intact', total: 15 });
    expect(PriceCalculator.sale(30, 1, { breakagePenalty: -10, broken: false }, DEFAULT_ECONOMY_RULES)).toMatchObject({
      condition: 'damaged',
      total: 7.5,
    });
    expect(PriceCalculator.sale(30, 1, { breakagePenalty: 0, broken: true }, DEFAULT_ECONOMY_RULES)).toMatchObject({
      condition: 'broken',
      total: 1.5,
    });
    expect(PriceCalculator.sale(30, 2, intact, DEFAULT_ECONOMY_RULES, { unitPrice: 4 })).toMatchObject({ unitPrice: 4, total: 8 });
  });

  it('prices the materials at a percent of the average cost', () => {
    expect(PriceCalculator.materials(10, DEFAULT_ECONOMY_RULES)).toBe(5);
    expect(PriceCalculator.materials(10, DEFAULT_ECONOMY_RULES, 3)).toBe(3);
  });
});

describe('ItemRepair (spec 023, decision 11)', () => {
  it('takes -100 for a broken item and its damage otherwise', () => {
    expect(ItemRepair.rollPenalty({ breakagePenalty: -20, broken: true })).toBe(-100);
    expect(ItemRepair.rollPenalty({ breakagePenalty: -30, broken: false })).toBe(-30);
  });

  it('repairs a damaged item on a success and halves the damage on a partial success', () => {
    const damaged = [quality, breakage(-20), breakage(-15)];
    expect(ItemRepair.apply(damaged, 'success', false)).toMatchObject({ outcome: 'repaired', breakage: [] });
    const halved = ItemRepair.apply(damaged, 'partial-success', false);
    expect(halved.outcome).toBe('halved');
    expect(halved.breakage).toEqual([expect.objectContaining({ value: -17, source: { kind: 'repair' } })]);
    expect(ItemRepair.apply(damaged, 'failure', false).breakage).toHaveLength(2);
  });

  it('fixes a broken item with a permanent -10 on a success, as new on an absolute success, and not on a partial one', () => {
    const broken = [breakage(-20, true)];
    expect(ItemRepair.apply(broken, 'success', false).breakage).toEqual([expect.objectContaining({ value: -10 })]);
    expect(ItemRepair.apply(broken, 'absolute-success', false)).toMatchObject({ outcome: 'as-new', breakage: [] });
    expect(ItemRepair.apply(broken, 'partial-success', false)).toMatchObject({ outcome: 'cannot-fix-broken', breakage: broken });
  });

  it('breaks the item on an absolute failure, and leaves a broken one unrepairable', () => {
    const broke = ItemRepair.apply([breakage(-20)], 'absolute-failure', false);
    expect(broke.outcome).toBe('broken');
    expect(broke.breakage.some(modifier => modifier.broken)).toBe(true);
    expect(ItemRepair.apply([breakage(-20, true)], 'absolute-failure', false)).toMatchObject({
      outcome: 'unrepairable',
      unrepairable: true,
    });
  });

  it('jury-rigs the item on an unmodified 66', () => {
    expect(ItemRepair.apply([breakage(-20, true)], 'partial-success', true)).toMatchObject({
      outcome: 'jury-rigged-working',
      breakage: [],
    });
    const useless = ItemRepair.apply([breakage(-20)], 'failure', true);
    expect(useless.outcome).toBe('jury-rigged-useless');
    expect(useless.breakage.some(modifier => modifier.broken)).toBe(true);
  });
});

describe('CraftingOutcomes (spec 023, decision 10)', () => {
  it('makes nothing on a failure', () => {
    expect(CraftingOutcomes.resolve('failure', [], [{ appliesTo: 'attack', value: 5 }], 'e1')).toEqual({
      crafted: false,
      modifiers: [],
      material: null,
      masterwork: false,
    });
  });

  it('adds the enhancements and the Strength change of the result', () => {
    const outcome = CraftingOutcomes.resolve(
      'partial-success',
      [{ status: 'itemBreakage', value: -10 }],
      [{ appliesTo: 'attack', value: 5 }],
      'e1',
    );
    expect(outcome.crafted).toBe(true);
    expect(outcome.modifiers).toEqual([
      expect.objectContaining({ type: 'quality', appliesTo: 'attack', value: 5, source: { kind: 'crafting', ledgerEntryId: 'e1' } }),
      expect.objectContaining({ type: 'quality', appliesTo: 'breakage', value: -10 }),
    ]);
  });
});
