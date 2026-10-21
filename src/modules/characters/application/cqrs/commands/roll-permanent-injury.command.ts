import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class RollPermanentInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly roll: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
