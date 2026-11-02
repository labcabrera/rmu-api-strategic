import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Throws away an item, or units of a stack, with an entry in the ledger (workspace spec 023, decision 8). */
export class DiscardItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly amount: number | undefined,
    public readonly note: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
