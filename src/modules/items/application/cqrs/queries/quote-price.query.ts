import type { PriceFactorSelection, PriceKind } from '../../../domain/services/price-calculator.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { TradingRequest } from '../../services/trading.service.js';

/** Price of a purchase or sale without making it (workspace spec 023, decision 14: the market shows it first). */
export class QuotePriceQuery {
  constructor(
    public readonly kind: PriceKind,
    public readonly options: {
      itemTypeId?: string;
      itemId?: string;
      /** The buyer or seller, for the Trading bonus of its sheet. */
      holder?: ItemHolder;
      amount?: number;
      unitPrice?: number;
      salePercent?: number;
      /** Market conditions of the expected price (workspace spec 048) */
      factors?: PriceFactorSelection[];
      trading?: TradingRequest;
    },
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
