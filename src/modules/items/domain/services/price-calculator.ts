import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemCondition } from '../value-objects/item-modifier.vo.js';
import type { NegotiationOutcome, NegotiationRow, TradingTables } from '../value-objects/trading-tables.vo.js';

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

/**
 * Result of a Trading maneuver. With the Treasure Law tables (workspace spec 048) the total gives the percent of the
 * expected price directly; with the Core Law rule (spec 023) it goes to the percent maneuver table of core.
 */
export interface TradingResult {
  total: number;
  /** Core Law: percent of the core percent maneuver table for the total. */
  maneuverPercent?: number;
  /** Percent of the price it gives; null when there is no deal. */
  pricePercent: number | null;
  /** Rule used: the negotiation table of Treasure Law, or 200% less the result of Core Law. */
  table?: 'treasure-law' | 'core-law';
  /** Special result of the negotiation table. */
  outcome?: NegotiationOutcome;
}

/** A market condition chosen by the client: the key of the factor and its option or units. */
export interface PriceFactorSelection {
  key: string;
  option?: string;
  units?: number;
}

/** A resolved market condition, as kept in the breakdown. */
export interface PriceFactorItem extends PriceFactorSelection {
  mode: 'multiplier' | 'percent';
  value: number;
}

/** The market conditions of a price: the factor of the expected price and each condition. */
export interface PriceFactors {
  value: number;
  items: PriceFactorItem[];
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
  /** Market conditions (workspace spec 048) */
  factor?: PriceFactors;
  /** Base times the factor, before the negotiation */
  expectedUnitPrice?: number;
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

  /**
   * Purchase of `amount` units: the base times the factor of the market conditions is the expected price, and the
   * Trading percent applies to it.
   */
  purchase(unitBase: number, amount: number, options: { factor?: PriceFactors; trading?: TradingResult } = {}): PriceBreakdown {
    PriceCalculator.checkAmount(amount);
    const { factor, trading } = options;
    const expected = factor ? roundGold(unitBase * factor.value) : unitBase;
    const percent = trading?.pricePercent ?? 100;
    const unitPrice = roundGold((expected * percent) / 100);
    return {
      kind: 'purchase',
      unitBase,
      amount,
      ...(factor ? { factor, expectedUnitPrice: expected } : {}),
      ...(trading ? { trading } : {}),
      unitPrice,
      total: roundGold(unitPrice * amount),
    };
  },

  /**
   * Sale of `amount` units of an item worth `value` each: an asked `unitPrice` wins; otherwise the value times the
   * sale percent, the condition percent and the factor of the market conditions, and then the Trading percent.
   */
  sale(
    value: number,
    amount: number,
    condition: ItemCondition,
    rules: EconomyRules,
    options: { unitPrice?: number; factor?: PriceFactors; trading?: TradingResult } = {},
  ): PriceBreakdown {
    PriceCalculator.checkAmount(amount);
    if (options.unitPrice !== undefined) {
      const unitPrice = roundGold(options.unitPrice);
      return { kind: 'sale', unitBase: unitPrice, amount, unitPrice, total: roundGold(unitPrice * amount) };
    }
    const state = PriceCalculator.conditionOf(condition);
    const conditionPercent = rules.conditionPercent[state];
    const { factor, trading } = options;
    const expected = roundGold((value * rules.salePercent * conditionPercent * (factor?.value ?? 1)) / 1e4);
    const tradingPercent = trading?.pricePercent ?? 100;
    const unitPrice = roundGold((expected * tradingPercent) / 100);
    return {
      kind: 'sale',
      unitBase: value,
      amount,
      salePercent: rules.salePercent,
      conditionPercent,
      condition: state,
      ...(factor ? { factor, expectedUnitPrice: expected } : {}),
      ...(trading ? { trading } : {}),
      unitPrice,
      total: roundGold(unitPrice * amount),
    };
  },

  /**
   * Factor of the expected price for the chosen market conditions (workspace spec 048): the product of the
   * multipliers plus the percents, as in the Treasure Law example (x3 x0.5 x2 + 42% = x3.42).
   */
  factor(tables: TradingTables, kind: PriceKind, selections: PriceFactorSelection[]): PriceFactors | undefined {
    if (selections.length === 0) return undefined;
    const items = selections.map((selection): PriceFactorItem => {
      const factor = tables.priceFactors.find(candidate => candidate.key === selection.key);
      if (!factor || (factor.contexts?.length && !factor.contexts.includes(kind))) {
        throw new ValidationError(`Unknown market condition ${selection.key}`, 'err-trading-unknown-factor');
      }
      switch (factor.type) {
        case 'choice': {
          const option = factor.options?.find(candidate => candidate.key === selection.option);
          if (!option) throw new ValidationError(`Unknown option ${selection.option} of ${factor.key}`, 'err-trading-unknown-factor');
          return { key: factor.key, option: option.key, mode: factor.mode, value: option.value };
        }
        case 'number': {
          const units = selection.units ?? 0;
          if (!Number.isFinite(units) || units < (factor.min ?? 0) || (factor.max !== undefined && units > factor.max)) {
            throw new ValidationError(`Invalid units ${units} of ${factor.key}`, 'err-trading-unknown-factor');
          }
          return { key: factor.key, units, mode: factor.mode, value: units * (factor.perUnit ?? 0) };
        }
        default:
          return { key: factor.key, mode: factor.mode, value: factor.value ?? (factor.mode === 'multiplier' ? 1 : 0) };
      }
    });
    if (new Set(items.map(item => item.key)).size !== items.length) {
      throw new ValidationError('A market condition is repeated', 'err-trading-unknown-factor');
    }
    const multiplier = items.filter(item => item.mode === 'multiplier').reduce((product, item) => product * item.value, 1);
    const percent = items.filter(item => item.mode === 'percent').reduce((sum, item) => sum + item.value, 0);
    return { value: Math.round((multiplier + percent / 100) * 1e4) / 1e4, items };
  },

  /** Row of the negotiation table for a total. */
  negotiationRow(rows: NegotiationRow[], total: number): NegotiationRow | undefined {
    return rows.find(row => (row.min === null || total >= row.min) && (row.max === null || total <= row.max));
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
