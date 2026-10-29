import type { PriceKind } from '../services/price-calculator.js';

/** Special results of the negotiation: no deal, a deal gone wrong, or a better offer than the table gives. */
export type NegotiationOutcome = 'no-agreement' | 'absolute-failure' | 'special-offer';

/** One row of the negotiation table of rmu-api-core: percent of the expected price for a range of the total. */
export interface NegotiationRow {
  min: number | null;
  max: number | null;
  purchase: number | null;
  sale: number | null;
  outcome?: NegotiationOutcome;
}

export type PriceFactorType = 'choice' | 'flag' | 'number';
/** A multiplier of the expected price, or percent points added to it. */
export type PriceFactorMode = 'multiplier' | 'percent';

/** A market condition of the expected price (workspace spec 048). */
export interface PriceFactor {
  key: string;
  type: PriceFactorType;
  mode: PriceFactorMode;
  value?: number;
  options?: { key: string; value: number }[];
  perUnit?: number;
  min?: number;
  max?: number;
  /** Sides it applies to; every side when missing */
  contexts?: PriceKind[];
}

/** Trading tables of rmu-api-core (GET /v1/trading-tables): the values come from the rulebook data. */
export interface TradingTables {
  negotiation: NegotiationRow[];
  priceFactors: PriceFactor[];
}
