import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class GetItemsQuery extends AuthenticatedCommand {
  constructor(
    public readonly rsql: string | undefined,
    public readonly page: number,
    public readonly size: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
