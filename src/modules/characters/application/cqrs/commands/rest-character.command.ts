import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class RestCharacterCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly hours: number,
    public readonly days: number,
    public readonly fullRest: boolean,
    userId: string,
    roles: string[],
    // Workspace spec 077, D11
    public readonly minutes = 0,
    // Workspace spec 079, C2: travel or work instead of resting
    public readonly active = false,
  ) {
    super(userId, roles);
  }
}
