import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class AddFactionXPCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly xp: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
