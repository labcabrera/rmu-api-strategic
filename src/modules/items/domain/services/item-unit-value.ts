import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemCost, ItemFeatures, ItemJewelry } from '../value-objects/item-catalog-info.vo.js';
import { roundGold } from './price-calculator.js';

/** Size of an instance (workspace spec 062): null is medium. */
export type ItemSize = 'small' | 'medium' | 'big' | 'large';
export const ITEM_SIZES: ItemSize[] = ['small', 'medium', 'big', 'large'];

/** Steps of each size from medium. */
const SIZE_STEPS: Record<ItemSize, number> = { small: -1, medium: 0, big: 1, large: 2 };

/** Cost and weight times 4 per size step, length times 1.6 (Treasure Law 2.2, other sizes). */
export const SIZE_COST_FACTOR = 4;
export const SIZE_LENGTH_FACTOR = 1.6;

export type JewelryClass = 'junk' | 'costume' | 'quality' | 'fine' | 'extravagant';
export const JEWELRY_CLASSES: JewelryClass[] = ['junk', 'costume', 'quality', 'fine', 'extravagant'];
/** The class of a jewelry instance when none is given: the catalog cost is the one of this class. */
export const DEFAULT_JEWELRY_CLASS: JewelryClass = 'quality';

/** Factor of the base value of a jewel by its class, in gold (the book's x0.01 to x100 silver). */
export const JEWELRY_CLASS_FACTORS: Record<JewelryClass, number> = {
  junk: 0.001,
  costume: 0.01,
  quality: 0.1,
  fine: 1,
  extravagant: 10,
};

/** The categories the instance fields belong to. */
export const GEM_CATEGORY = 'gem';
export const JEWELRY_CATEGORY = 'jewelry';
/** Categories that have no size: a gem is weighed in carats and coins are coins. */
const UNSIZED_CATEGORIES = [GEM_CATEGORY, 'coins', 'currency'];

/** What an instance adds to its catalog type (workspace spec 062). */
export interface ItemInstanceSpec {
  size?: ItemSize | null;
  carats?: number | null;
  cutFactor?: number | null;
  jewelryClass?: JewelryClass | null;
  /** Jewelry: base value before the class factor (rolled in the range of the type when missing). */
  jewelryValue?: number | null;
}

/** The catalog data the unit value needs. */
export interface UnitValueType {
  category: string;
  cost: ItemCost | null | undefined;
  features?: ItemFeatures | null;
  /** Size the catalog type is made for: a weapon of the catalog for small wielders is not scaled down again. */
  baseSize?: string | null;
}

const isSize = (value: unknown): value is ItemSize => typeof value === 'string' && (ITEM_SIZES as string[]).includes(value);

/**
 * Pure rules of the value of an instance (workspace spec 062): gems by carats, jewelry by class, and the other sizes.
 * Values are in gold, rounded like every price (three decimals).
 */
export const ItemUnitValue = {
  /** Size steps from `base` (medium when unknown) to `size`. */
  steps(size: string | null | undefined, base?: string | null): number {
    const to = isSize(size) ? SIZE_STEPS[size] : 0;
    const from = isSize(base) ? SIZE_STEPS[base] : 0;
    return to - from;
  },

  /** Cost and weight factor of a number of steps. */
  sizeFactor(steps: number): number {
    return Math.pow(SIZE_COST_FACTOR, steps);
  },

  lengthFactor(steps: number): number {
    return Math.pow(SIZE_LENGTH_FACTOR, steps);
  },

  /** Weight of the other size, with two decimals as the item weights. */
  scaleWeight(weight: number, steps: number): number {
    return steps === 0 ? weight : Math.round(weight * ItemUnitValue.sizeFactor(steps) * 100) / 100;
  },

  scaleLength(length: number | null, steps: number): number | null {
    if (length === null || length === undefined || steps === 0) return length;
    return Math.round(length * ItemUnitValue.lengthFactor(steps) * 100) / 100;
  },

  /** A gem: value per carat times the carats, times the optional modern cut. */
  gem(valuePerCarat: number, carats: number, cutFactor?: number | null): number {
    return roundGold(valuePerCarat * carats * (cutFactor ?? 1));
  },

  /** A jewel: the base value times the factor of its class. */
  jewelry(baseValue: number, jewelryClass: JewelryClass | null | undefined): number {
    return roundGold(baseValue * JEWELRY_CLASS_FACTORS[jewelryClass ?? DEFAULT_JEWELRY_CLASS]);
  },

  /** A whole base value in the range of the jewelry type. */
  rollJewelry(range: ItemJewelry['value'], random: () => number = Math.random): number {
    const min = Math.ceil(Math.min(range.min, range.max));
    const max = Math.floor(Math.max(range.min, range.max));
    return min + Math.floor(random() * (max - min + 1));
  },

  /**
   * Checks the instance fields against the category of the type: carats and cut only on gems, the class and the base
   * value only on jewelry, no size on gems and coins.
   */
  validate(type: UnitValueType, spec: ItemInstanceSpec): void {
    const gem = type.category === GEM_CATEGORY;
    const jewelry = type.category === JEWELRY_CATEGORY;
    if (spec.size !== undefined && spec.size !== null) {
      if (!isSize(spec.size)) throw new ValidationError(`Invalid size ${String(spec.size)}`, 'err-item-invalid-size');
      if (UNSIZED_CATEGORIES.includes(type.category)) {
        throw new ValidationError(`A ${type.category} item has no size`, 'err-item-invalid-size');
      }
    }
    if ((spec.carats !== undefined && spec.carats !== null) || (spec.cutFactor !== undefined && spec.cutFactor !== null)) {
      if (!gem) throw new ValidationError('Carats and cut are only for gems', 'err-item-invalid-gem');
      if (spec.carats !== undefined && spec.carats !== null && !(spec.carats > 0)) {
        throw new ValidationError('The carats must be over 0', 'err-item-invalid-gem');
      }
      if (spec.cutFactor !== undefined && spec.cutFactor !== null && !(spec.cutFactor > 0)) {
        throw new ValidationError('The cut factor must be over 0', 'err-item-invalid-gem');
      }
    }
    if (
      (spec.jewelryClass !== undefined && spec.jewelryClass !== null) ||
      (spec.jewelryValue !== undefined && spec.jewelryValue !== null)
    ) {
      if (!jewelry) throw new ValidationError('The class and value are only for jewelry', 'err-item-invalid-jewelry');
      if (spec.jewelryClass && !JEWELRY_CLASSES.includes(spec.jewelryClass)) {
        throw new ValidationError(`Invalid jewelry class ${spec.jewelryClass}`, 'err-item-invalid-jewelry');
      }
      if (spec.jewelryValue !== undefined && spec.jewelryValue !== null && !(spec.jewelryValue >= 0)) {
        throw new ValidationError('The jewelry value cannot be negative', 'err-item-invalid-jewelry');
      }
    }
  },

  /**
   * The instance fields with their defaults: one carat for a gem, the quality class and a rolled base value for a
   * jewel (when the type has a range).
   */
  resolve(type: UnitValueType, spec: ItemInstanceSpec, random: () => number = Math.random): ItemInstanceSpec {
    ItemUnitValue.validate(type, spec);
    const resolved: ItemInstanceSpec = {};
    if (spec.size && type.category !== GEM_CATEGORY) resolved.size = spec.size;
    if (type.category === GEM_CATEGORY) {
      resolved.carats = spec.carats ?? 1;
      if (spec.cutFactor !== undefined && spec.cutFactor !== null) resolved.cutFactor = spec.cutFactor;
    }
    if (type.category === JEWELRY_CATEGORY) {
      resolved.jewelryClass = spec.jewelryClass ?? DEFAULT_JEWELRY_CLASS;
      const range = type.features?.jewelry?.value;
      const base = spec.jewelryValue ?? (range ? ItemUnitValue.rollJewelry(range, random) : null);
      if (base !== null && base !== undefined) resolved.jewelryValue = base;
    }
    return resolved;
  },

  /**
   * Gold of one unit of the instance: a gem by its carats, a jewel by its base value and class (the catalog cost, which
   * is the one of the quality class, when it has no base value), any other type by its average cost, times 4 per size
   * step. Null without a cost.
   */
  unitValue(type: UnitValueType, spec: ItemInstanceSpec): number | null {
    const steps = ItemUnitValue.steps(spec.size, type.baseSize);
    const scale = (value: number) => roundGold(value * ItemUnitValue.sizeFactor(steps));
    if (type.category === GEM_CATEGORY) {
      const perCarat = type.features?.gem?.valuePerCarat;
      if (perCarat === undefined || perCarat === null) return type.cost?.average ?? null;
      return ItemUnitValue.gem(perCarat, spec.carats ?? 1, spec.cutFactor);
    }
    if (type.category === JEWELRY_CATEGORY && spec.jewelryValue !== undefined && spec.jewelryValue !== null) {
      return scale(ItemUnitValue.jewelry(spec.jewelryValue, spec.jewelryClass));
    }
    const average = type.cost?.average;
    if (average === undefined || average === null) return null;
    // The catalog cost of a jewel is the one of the quality class
    const classFactor =
      type.category === JEWELRY_CATEGORY && spec.jewelryClass
        ? JEWELRY_CLASS_FACTORS[spec.jewelryClass] / JEWELRY_CLASS_FACTORS[DEFAULT_JEWELRY_CLASS]
        : 1;
    return steps === 0 && classFactor === 1 ? average : scale(average * classFactor);
  },
};
