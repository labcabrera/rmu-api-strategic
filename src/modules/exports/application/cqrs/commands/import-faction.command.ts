import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Imports a faction file into a strategic game: the faction, its armory and its characters (spec 024). */
export class ImportFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly file: unknown,
    public readonly dryRun: boolean,
    public readonly fileName: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
