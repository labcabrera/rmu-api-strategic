import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

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
