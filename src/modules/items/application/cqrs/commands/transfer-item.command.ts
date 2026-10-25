import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';

/** Gives an item, or units of a stack, to another holder of the same game (workspace spec 023, decision 8). */
export class TransferItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly to: ItemHolder,
    public readonly amount: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
