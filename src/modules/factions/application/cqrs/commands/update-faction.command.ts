import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly name: string,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {
    super(userId, roles);
  }
}
