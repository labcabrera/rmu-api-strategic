import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `POST /v1/items/:id/coating`: a dose of a poison of the same holder on a weapon (workspace spec 042, decision 11). */
export class CoatItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly poisonItemId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `DELETE /v1/items/:id/coating`: the poison dries or is wiped off. */
export class RemoveCoatingCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
