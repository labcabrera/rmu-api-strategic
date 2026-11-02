import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Workspace spec 068: the game master removes a temporary modifier of a character. */
export class RemoveTemporaryModifierCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly modifierId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
