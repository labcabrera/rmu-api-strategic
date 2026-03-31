import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class DeleteGamesByRealmCommand extends AuthenticatedCommand {
  constructor(
    public readonly realmId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
