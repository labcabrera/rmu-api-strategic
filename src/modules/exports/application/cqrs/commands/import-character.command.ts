import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Imports a character file, or one character (`characterRef`) of a faction file, into a faction (spec 024). */
export class ImportCharacterCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly file: unknown,
    public readonly characterRef: string | undefined,
    public readonly dryRun: boolean,
    public readonly fileName: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
