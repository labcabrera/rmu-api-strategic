import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class UnequipItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    userId: string,
    userRoles: string[],
  ) {
    super(userId, userRoles);
  }
}
