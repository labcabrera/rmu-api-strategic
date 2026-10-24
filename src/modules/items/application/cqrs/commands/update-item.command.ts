import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly name: string | undefined,
    public readonly wielderSize: string | undefined,
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {
    super(userId, roles);
  }
}
