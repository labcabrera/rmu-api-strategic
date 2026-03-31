import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

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
