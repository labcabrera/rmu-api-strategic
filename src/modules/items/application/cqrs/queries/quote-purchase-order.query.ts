import type { PriceFactorSelection } from '../../../domain/services/price-calculator.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { PurchaseOrderLine } from '../../services/purchase-pricing.service.js';
import type { TradingRequest } from '../../services/trading.service.js';

/** Prices of a purchase order without making it (workspace spec 048): the checkout shows them before paying. */
export class QuotePurchaseOrderQuery {
  constructor(
    public readonly buyer: ItemHolder | undefined,
    public readonly lines: PurchaseOrderLine[],
    public readonly options: { factors?: PriceFactorSelection[]; trading?: TradingRequest },
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
