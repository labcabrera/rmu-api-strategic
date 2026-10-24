import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class DeleteFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly reason: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
