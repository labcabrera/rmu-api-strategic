import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { PriceFactorSelection } from '../../../domain/services/price-calculator.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { PurchaseOrderLine } from '../../services/purchase-pricing.service.js';
import type { TradingRequest } from '../../services/trading.service.js';
import type { PayerMode } from '../../services/wallet.service.js';

/**
 * Buys several item types at once (workspace spec 048): one payment, and the same market conditions and Trading
 * maneuver for every line. Without conditions and Trading it is a direct purchase at the average cost.
 */
export class PurchaseOrderCommand extends AuthenticatedCommand {
  constructor(
    public readonly buyer: ItemHolder,
    public readonly lines: PurchaseOrderLine[],
    public readonly options: { gameId?: string; payer?: PayerMode; factors?: PriceFactorSelection[]; trading?: TradingRequest },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
