import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class GetItemQuery extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
