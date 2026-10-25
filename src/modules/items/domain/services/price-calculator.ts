import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemCondition } from '../value-objects/item-modifier.vo.js';

/** Gold is kept with three decimals (a copper piece is 0.001 gp, Core Law table 6-0a). */
export const roundGold = (gold: number): number => Math.round(gold * 1000) / 1000;

/** Limits of a Trading price (§3, Trading): 200% less the result of the opposed percent maneuver. */
export const MIN_TRADING_PERCENT = 50;
export const MAX_TRADING_PERCENT = 200;
const TRADING_BASE = 200;

/**
 * House rules of the economy (workspace spec 023, decisions 10 and 12): Core Law does not fix them, so they come from
 * the configuration and each request can override them.
 */
export interface EconomyRules {
  /** Percent of the value paid when an item is sold. */
  salePercent: number;
  /** Percent of the average cost the materials of a crafted item cost. */
  materialsPercent: number;
  /** Percent of the sale price by condition. */
  conditionPercent: { intact: number; damaged: number; broken: number };
}

export const DEFAULT_ECONOMY_RULES: EconomyRules = {
  salePercent: 50,
  materialsPercent: 50,
  conditionPercent: { intact: 100, damaged: 50, broken: 10 },
};

/** Result of a Trading maneuver, as the percent of the percent maneuver table of core. */
export interface TradingResult {
  total: number;
  /** Percent of the core percent maneuver table for the total. */
  maneuverPercent: number;
  /** Percent of the price it gives. */
  pricePercent: number;
}

export type PriceKind = 'purchase' | 'sale';

/** How a price was worked out, returned to the client and kept in the ledger. */
export interface PriceBreakdown {
  kind: PriceKind;
  /** Base gold of one unit: the asked price, the average cost or the value of the item. */
  unitBase: number;
  amount: number;
  /** Sale: percent of the value paid (house rule). */
  salePercent?: number;
  /** Sale: percent for the condition of the item. */
  conditionPercent?: number;
  condition?: 'intact' | 'damaged' | 'broken';
  trading?: TradingResult;
  unitPrice: number;
  total: number;
}

export const PriceCalculator = {
  /**
   * Percent of the price for a Trading maneuver. Buying, the buyer is the active side: 200% less the percent, so a
   * better deal is a lower price. Selling, the seller is the active side and gets the percent itself. Both between
   * 50% and 200%.
   */
  tradingPercent(kind: PriceKind, maneuverPercent: number): number {
    const percent = kind === 'purchase' ? TRADING_BASE - maneuverPercent : maneuverPercent;
    return Math.min(MAX_TRADING_PERCENT, Math.max(MIN_TRADING_PERCENT, percent));
  },

  conditionOf(condition: ItemCondition): 'intact' | 'damaged' | 'broken' {
    if (condition.broken || condition.unrepairable) return 'broken';
    return condition.breakagePenalty < 0 ? 'damaged' : 'intact';
  },

  purchase(unitBase: number, amount: number, trading?: TradingResult): PriceBreakdown {
    PriceCalculator.checkAmount(amount);
    const percent = trading ? trading.pricePercent : 100;
    const unitPrice = roundGold((unitBase * percent) / 100);
    return { kind: 'purchase', unitBase, amount, ...(trading ? { trading } : {}), unitPrice, total: roundGold(unitPrice * amount) };
  },

  /**
   * Sale of `amount` units of an item worth `value` each: an asked `unitPrice` wins; otherwise the value times the
   * sale percent and the condition percent, and then the Trading percent.
   */
  sale(
    value: number,
    amount: number,
    condition: ItemCondition,
    rules: EconomyRules,
    options: { unitPrice?: number; trading?: TradingResult } = {},
  ): PriceBreakdown {
    PriceCalculator.checkAmount(amount);
    if (options.unitPrice !== undefined) {
      const unitPrice = roundGold(options.unitPrice);
      return { kind: 'sale', unitBase: unitPrice, amount, unitPrice, total: roundGold(unitPrice * amount) };
    }
    const state = PriceCalculator.conditionOf(condition);
    const conditionPercent = rules.conditionPercent[state];
    const tradingPercent = options.trading ? options.trading.pricePercent : 100;
    const unitPrice = roundGold((value * rules.salePercent * conditionPercent * tradingPercent) / 1e6);
    return {
      kind: 'sale',
      unitBase: value,
      amount,
      salePercent: rules.salePercent,
      conditionPercent,
      condition: state,
      ...(options.trading ? { trading: options.trading } : {}),
      unitPrice,
      total: roundGold(unitPrice * amount),
    };
  },

  /** Materials of a crafted item: the asked cost, or a percent of the average cost of its type. */
  materials(averageCost: number, rules: EconomyRules, asked?: number): number {
    if (asked !== undefined) {
      if (asked < 0) throw new ValidationError('The materials cost cannot be negative', 'err-item-invalid-price');
      return roundGold(asked);
    }
    return roundGold((averageCost * rules.materialsPercent) / 100);
  },

  checkAmount(amount: number): void {
    if (!(amount > 0)) throw new ValidationError(`Invalid amount ${amount}`, 'err-item-invalid-amount');
  },
};
