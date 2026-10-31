import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { FactionNpcInput } from '../../services/faction-npcs.resolver.js';

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
    /** Spec 055: the whole list of NPCs; undefined leaves it as it is. */
    public readonly npcs?: FactionNpcInput[],
  ) {
    super(userId, roles);
  }
}
