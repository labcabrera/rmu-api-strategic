import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class AddFactionGoldCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly gold: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
