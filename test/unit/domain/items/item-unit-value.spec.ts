import { ItemUnitValue, type UnitValueType } from '../../../../src/modules/items/domain/services/item-unit-value.js';
import { PriceCalculator } from '../../../../src/modules/items/domain/services/price-calculator.js';
import { DomainError } from '../../../../src/modules/shared/domain/errors/errors.js';

// Invented catalog types (workspace spec 062): not the rulebook rows
const GEM: UnitValueType = { category: 'gem', cost: null, features: { gem: { grade: 'precious', mineral: 'x', valuePerCarat: 2.5 } } };
const RING: UnitValueType = {
  category: 'jewelry',
  cost: { min: 1, average: 1.5, max: 2 },
  features: { jewelry: { value: { min: 10, max: 20, dice: null, openEnded: false }, slot: 'finger' } },
};
const SWORD: UnitValueType = { category: 'weapon', cost: { min: 8, average: 10, max: 12 } };

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return (error as DomainError).code;
  }
  return undefined;
};

describe('ItemUnitValue (workspace spec 062)', () => {
  it('values a gem by its carats and its optional modern cut', () => {
    expect(ItemUnitValue.unitValue(GEM, { carats: 4 })).toBe(10);
    expect(ItemUnitValue.unitValue(GEM, { carats: 4, cutFactor: 5 })).toBe(50);
    // One carat by default
    expect(ItemUnitValue.resolve(GEM, {})).toEqual({ carats: 1 });
    expect(ItemUnitValue.unitValue(GEM, {})).toBe(2.5);
    // Without a price per carat the catalog cost stays
    expect(ItemUnitValue.unitValue({ category: 'gem', cost: { min: 1, average: 3, max: 5 } }, { carats: 2 })).toBe(3);
  });

  it('values a jewel by its base value times the gold factor of its class', () => {
    expect(ItemUnitValue.jewelry(12, 'junk')).toBe(0.012);
    expect(ItemUnitValue.jewelry(12, 'costume')).toBe(0.12);
    expect(ItemUnitValue.jewelry(12, 'quality')).toBe(1.2);
    expect(ItemUnitValue.jewelry(12, 'fine')).toBe(12);
    expect(ItemUnitValue.jewelry(12, 'extravagant')).toBe(120);
    // Tiny values keep the copper piece (three decimals)
    expect(ItemUnitValue.jewelry(0.4, 'junk')).toBe(0);
    expect(ItemUnitValue.jewelry(1, 'junk')).toBe(0.001);
    // The catalog cost is the one of the quality class
    expect(ItemUnitValue.unitValue(RING, { jewelryClass: 'fine' })).toBe(15);
    expect(ItemUnitValue.unitValue(RING, {})).toBe(1.5);
  });

  it('rolls the base value of a jewel in the range of its type, with the quality class by default', () => {
    expect(ItemUnitValue.resolve(RING, {}, () => 0)).toEqual({ jewelryClass: 'quality', jewelryValue: 10 });
    expect(ItemUnitValue.resolve(RING, {}, () => 0.999)).toEqual({ jewelryClass: 'quality', jewelryValue: 20 });
    expect(ItemUnitValue.resolve(RING, { jewelryClass: 'fine', jewelryValue: 13 })).toEqual({ jewelryClass: 'fine', jewelryValue: 13 });
    expect(ItemUnitValue.rollJewelry({ min: 1, max: 100, dice: 'd100', openEnded: true }, () => 0.5)).toBe(51);
  });

  it('scales cost and weight x4 and length x1.6 per size step from the size of the type', () => {
    expect(ItemUnitValue.steps('large')).toBe(2);
    expect(ItemUnitValue.steps('small')).toBe(-1);
    expect(ItemUnitValue.steps(null)).toBe(0);
    expect(ItemUnitValue.steps('medium', 'small')).toBe(1);
    expect(ItemUnitValue.unitValue(SWORD, { size: 'big' })).toBe(40);
    expect(ItemUnitValue.unitValue(SWORD, { size: 'large' })).toBe(160);
    expect(ItemUnitValue.unitValue(SWORD, { size: 'small' })).toBe(2.5);
    expect(ItemUnitValue.unitValue({ ...SWORD, baseSize: 'big' }, { size: 'big' })).toBe(10);
    expect(ItemUnitValue.unitValue(RING, { jewelryClass: 'fine', jewelryValue: 10, size: 'big' })).toBe(40);
    expect(ItemUnitValue.scaleWeight(3, 1)).toBe(12);
    expect(ItemUnitValue.scaleWeight(3, -1)).toBe(0.75);
    expect(ItemUnitValue.scaleLength(1, 1)).toBe(1.6);
    expect(ItemUnitValue.scaleLength(1, 2)).toBe(2.56);
    expect(ItemUnitValue.scaleLength(null, 2)).toBeNull();
    expect(ItemUnitValue.unitValue({ category: 'tools', cost: null }, { size: 'big' })).toBeNull();
  });

  it('refuses the fields of another category', () => {
    expect(codeOf(() => ItemUnitValue.validate(SWORD, { carats: 2 }))).toBe('err-item-invalid-gem');
    expect(codeOf(() => ItemUnitValue.validate(GEM, { carats: 0 }))).toBe('err-item-invalid-gem');
    expect(codeOf(() => ItemUnitValue.validate(GEM, { cutFactor: -1 }))).toBe('err-item-invalid-gem');
    expect(codeOf(() => ItemUnitValue.validate(GEM, { size: 'big' }))).toBe('err-item-invalid-size');
    expect(codeOf(() => ItemUnitValue.validate(SWORD, { size: 'huge' as never }))).toBe('err-item-invalid-size');
    expect(codeOf(() => ItemUnitValue.validate(SWORD, { jewelryClass: 'fine' }))).toBe('err-item-invalid-jewelry');
    expect(codeOf(() => ItemUnitValue.validate(RING, { jewelryClass: 'shiny' as never }))).toBe('err-item-invalid-jewelry');
    expect(codeOf(() => ItemUnitValue.validate(RING, { jewelryValue: -1 }))).toBe('err-item-invalid-jewelry');
    expect(codeOf(() => ItemUnitValue.validate(RING, { jewelryClass: 'fine', jewelryValue: 5, size: 'small' }))).toBeUndefined();
  });
});

describe('PriceCalculator.jewelerSale (workspace spec 062)', () => {
  it('pays the value less the commission, with no condition, market or negotiation', () => {
    expect(PriceCalculator.jewelerSale(10, 2, 3)).toEqual({
      kind: 'sale',
      unitBase: 10,
      amount: 2,
      jewelerPercent: 3,
      unitPrice: 9.7,
      total: 19.4,
    });
    expect(PriceCalculator.jewelerSale(10, 1, 0).unitPrice).toBe(10);
    expect(codeOf(() => PriceCalculator.jewelerSale(10, 1, 101))).toBe('err-item-invalid-price');
  });
});
