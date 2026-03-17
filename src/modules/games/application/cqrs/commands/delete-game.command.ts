import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class DeleteGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly id: string,
    public readonly reason: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
