import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export type PowerChange = 'spend' | 'restore';

export class ChangePowerCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly change: PowerChange,
    public readonly amount: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
