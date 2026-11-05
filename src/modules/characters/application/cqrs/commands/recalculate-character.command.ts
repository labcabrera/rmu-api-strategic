import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Workspace spec 077, decision B1.7: runs the character processor again over the stored sheet (admin only). */
export class RecalculateCharacterCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
