import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class UpdateFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly name: string,
    public readonly management: FactionManagement | undefined,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
