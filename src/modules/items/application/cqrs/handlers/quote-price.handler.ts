import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type EconomyRules, type PriceBreakdown, PriceCalculator } from '../../../domain/services/price-calculator.js';
import { QuotePriceQuery } from '../queries/quote-price.query.js';
import { EconomyRulesProvider } from '../../services/economy-rules.provider.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { ItemAccess } from '../../services/item-access.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemStock } from '../../services/item-stock.service.js';
import { PurchasePricing } from '../../services/purchase-pricing.service.js';
import { TradingService } from '../../services/trading.service.js';
import { SellItemHandler } from './sell-item.handler.js';

export interface PriceQuote {
  price: PriceBreakdown;
  rules: EconomyRules;
}

/**
 * Price of a purchase (of an item type) or a sale (of an item) with the same rules as the operation, without making
 * it: the market shows the breakdown before the user confirms (workspace spec 023, decision 14).
 */
@QueryHandler(QuotePriceQuery)
export class QuotePriceHandler implements IQueryHandler<QuotePriceQuery, PriceQuote> {
  constructor(
    private readonly itemFactory: ItemFactory,
    private readonly stock: ItemStock,
    private readonly itemAccess: ItemAccess,
    private readonly holderAccess: HolderAccess,
    private readonly trading: TradingService,
    private readonly pricing: PurchasePricing,
    private readonly rulesProvider: EconomyRulesProvider,
  ) {}

  async execute(query: QuotePriceQuery): Promise<PriceQuote> {
    const { options } = query;
    const rules = this.rulesProvider.rules({ salePercent: options.salePercent, jewelerPercent: options.jewelerPercent });
    const holder = options.holder ? await this.holderAccess.load(options.holder) : null;
    const factor = options.factors?.length ? await this.pricing.factor(query.kind, options.factors) : undefined;
    // A quote shows a negotiation without a deal instead of failing: the operation fails with 422
    const trading = options.trading ? await this.trading.evaluate(query.kind, options.trading, holder?.character ?? null) : undefined;

    if (query.kind === 'purchase') {
      if (!options.itemTypeId) throw new ValidationError('itemTypeId is required', 'err-item-type-required');
      const itemType = await this.itemFactory.itemType(options.itemTypeId);
      // Workspace spec 062: a jewel without a base value is quoted at the middle of its range
      const { unitBase } = PurchasePricing.unitBase(itemType, options.instance, () => 0.5);
      const base = options.unitPrice ?? unitBase;
      return { price: PriceCalculator.purchase(base, options.amount ?? 1, { factor, trading: trading?.result }), rules };
    }

    if (!options.itemId) throw new ValidationError('itemId is required', 'err-item-required');
    const item = await this.stock.load(options.itemId);
    await this.itemAccess.checkRead(item, query.userId, query.roles);
    const units = this.stock.units(item, options.amount);
    if (options.jeweler) {
      return { price: PriceCalculator.jewelerSale(SellItemHandler.jewelValue(item), units, rules.jewelerPercent), rules };
    }
    const price = PriceCalculator.sale(item.unitValue, units, item.getCondition(), rules, {
      unitPrice: options.unitPrice,
      factor,
      trading: trading?.result,
    });
    return { price, rules };
  }
}
