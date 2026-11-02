import type { PowerLevel } from '../../../../enchantments/domain/value-objects/alchemy.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { MagicItemRequest } from '../../services/magic-items.service.js';

/** `POST /v1/items/magic/quote`: the price of a magic item, without making it (workspace spec 067, decision 7). */
export class QuoteMagicItemQuery {
  constructor(
    public readonly request: MagicItemRequest,
    public readonly powerLevel: PowerLevel | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `POST /v1/items/magic`: a magic item for a holder; `payer` null gives it for free. */
export class CreateMagicItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly request: MagicItemRequest,
    public readonly gameId: string,
    public readonly holder: ItemHolder,
    public readonly payer: ItemHolder | null,
    public readonly powerLevel: PowerLevel | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/items/:id/charges`: spends or adds charges (`delta`), or recharges the item (decision 8). */
export class ChangeItemChargesCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly change: { delta: number } | { recharge: true },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/items/:id/cut`: the modern cut of a gem (decision 18). */
export class CutGemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly cutFactor: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/items/:id/settings`: sets a gem of the same holder in the item (decision 19). */
export class SetGemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly gemItemId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `DELETE /v1/items/:id/settings/:index`: takes a gem out, back to the inventory of the holder. */
export class UnsetGemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly index: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
