import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { PriceFactorSelection } from '../../../domain/services/price-calculator.js';
import type { TradingRequest } from '../../services/trading.service.js';

/** Sells units of an item: the holder gets the gold (workspace spec 023, decision 8). */
export class SellItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly options: {
      amount?: number;
      unitPrice?: number;
      salePercent?: number;
      /** Market conditions of the expected price (workspace spec 048) */
      factors?: PriceFactorSelection[];
      trading?: TradingRequest;
      /** Workspace spec 062: a jeweler buys the gem or jewel for its value less the commission. */
      jeweler?: boolean;
      jewelerPercent?: number;
    },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
