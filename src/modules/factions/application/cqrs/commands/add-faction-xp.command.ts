import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

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
