import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly name: string | undefined,
    public readonly wielderSize: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
