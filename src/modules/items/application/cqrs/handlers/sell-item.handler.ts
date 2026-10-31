import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { GOLD_COIN } from '../../../domain/aggregates/item.js';
import { type PriceBreakdown, PriceCalculator } from '../../../domain/services/price-calculator.js';
import type { Item } from '../../../domain/aggregates/item.js';
import { GEM_CATEGORY, JEWELRY_CATEGORY } from '../../../domain/services/item-unit-value.js';
import { SellItemCommand } from '../commands/sell-item.command.js';
import { EconomyRulesProvider } from '../../services/economy-rules.provider.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { type ItemOperationResult, ItemStock } from '../../services/item-stock.service.js';
import { PurchasePricing } from '../../services/purchase-pricing.service.js';
import { TradingService } from '../../services/trading.service.js';
import { Wallet } from '../../services/wallet.service.js';

/**
 * A sale (workspace spec 023, decisions 8 and 12): the value of the item times the sale percent and the percent of its
 * condition and the factor of the market conditions (workspace spec 048), then the Trading percent, unless a price is
 * asked. The units leave the holder before it gets the gold,
 * and come back if the gold cannot be given.
 */
@CommandHandler(SellItemCommand)
export class SellItemHandler implements ICommandHandler<SellItemCommand, ItemOperationResult> {
  constructor(
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly wallet: Wallet,
    private readonly trading: TradingService,
    private readonly pricing: PurchasePricing,
    private readonly rules: EconomyRulesProvider,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: SellItemCommand): Promise<ItemOperationResult> {
    const { options, userId, roles } = command;
    const item = await this.stock.load(command.itemId);
    if (item.itemTypeId === GOLD_COIN) throw new ValidationError('Coins are not sold', 'err-item-gold-not-tradable');
    const seller = await this.holderAccess.load(item.holder);
    await this.holderAccess.checkManage(seller, userId, roles);

    const units = this.stock.units(item, options.amount);
    let trading: Awaited<ReturnType<TradingService['resolve']>> | undefined;
    let price: PriceBreakdown;
    if (options.jeweler) {
      // Workspace spec 062: no Trading roll and no market conditions
      const rules = this.rules.rules({ jewelerPercent: options.jewelerPercent });
      price = PriceCalculator.jewelerSale(SellItemHandler.jewelValue(item), units, rules.jewelerPercent);
    } else {
      const factor = options.factors?.length ? await this.pricing.factor('sale', options.factors) : undefined;
      trading = options.trading ? await this.trading.resolve('sale', options.trading, seller.character) : undefined;
      price = PriceCalculator.sale(item.unitValue, units, item.getCondition(), this.rules.rules({ salePercent: options.salePercent }), {
        unitPrice: options.unitPrice,
        factor,
        trading: trading?.result,
      });
    }

    const props = item.getProps();
    const taken = await this.stock.take(item, units);
    let payments;
    try {
      payments = price.total > 0 ? [await this.wallet.credit(seller, price.total)] : [];
    } catch (e) {
      await this.stock.restore(taken);
      throw e;
    }

    const entry = await this.ledger.record({
      gameId: seller.gameId,
      kind: 'sale',
      itemId: props.id,
      itemTypeId: props.itemTypeId,
      itemName: props.name,
      amount: units,
      from: seller.holder,
      to: null,
      payments,
      price,
      maneuver: trading?.maneuver ?? null,
      userId,
    });
    await this.inventorySync.refresh(seller.holder);
    return { item: taken.whole ? null : taken.item, entry };
  }

  /** Workspace spec 062: only gems and jewelry are sold to a jeweler, for their value. */
  static jewelValue(item: Item): number {
    if (item.category !== GEM_CATEGORY && item.category !== JEWELRY_CATEGORY) {
      throw new ValidationError('A jeweler only buys gems and jewelry', 'err-item-not-jewel');
    }
    return item.unitValue;
  }
}
