import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { TradingRequest } from '../../services/trading.service.js';
import type { PayerMode } from '../../services/wallet.service.js';

/** Buys items of a catalog type for a character or a faction (workspace spec 023, decision 8). */
export class PurchaseItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly buyer: ItemHolder,
    public readonly itemTypeId: string,
    public readonly options: {
      gameId?: string;
      amount?: number;
      /** Asked price of one unit; by default the average cost of the type. */
      unitPrice?: number;
      /** Who pays when the buyer is a character: by default its coins and then its faction. */
      payer?: PayerMode;
      trading?: TradingRequest;
      name?: string | null;
      description?: string | null;
      wielderSize?: string | null;
      carried?: boolean;
    },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
