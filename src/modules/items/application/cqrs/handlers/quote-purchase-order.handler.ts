import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { PriceBreakdown, PriceFactors, TradingResult } from '../../../domain/services/price-calculator.js';
import { QuotePurchaseOrderQuery } from '../queries/quote-purchase-order.query.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { PurchasePricing } from '../../services/purchase-pricing.service.js';

export interface PurchaseOrderQuote {
  lines: { itemTypeId: string; amount: number; price: PriceBreakdown }[];
  factor?: PriceFactors;
  /** The negotiation; a null price percent means there is no deal, and buying would fail with 422. */
  trading?: TradingResult;
  total: number;
}

/** Prices of a purchase order with the same rules as the operation, without making it (workspace spec 048). */
@QueryHandler(QuotePurchaseOrderQuery)
export class QuotePurchaseOrderHandler implements IQueryHandler<QuotePurchaseOrderQuery, PurchaseOrderQuote> {
  constructor(
    private readonly holderAccess: HolderAccess,
    private readonly pricing: PurchasePricing,
  ) {}

  async execute(query: QuotePurchaseOrderQuery): Promise<PurchaseOrderQuote> {
    const buyer = query.buyer ? await this.holderAccess.load(query.buyer) : null;
    const order = await this.pricing.order(query.lines, { ...query.options, character: buyer?.character ?? null, check: false });
    return {
      lines: order.lines.map(line => ({ itemTypeId: line.itemType.id, amount: line.amount, price: line.price })),
      ...(order.factor ? { factor: order.factor } : {}),
      ...(order.trading ? { trading: order.trading } : {}),
      total: order.total,
    };
  }
}
