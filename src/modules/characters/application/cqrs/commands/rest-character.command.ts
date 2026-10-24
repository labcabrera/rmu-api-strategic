import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class RestCharacterCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly hours: number,
    public readonly days: number,
    public readonly fullRest: boolean,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
