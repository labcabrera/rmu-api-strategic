import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

export class ResolveConditionCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly conditionId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
