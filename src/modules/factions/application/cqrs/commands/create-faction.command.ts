import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class CreateFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string,
    public readonly management: FactionManagement,
    public readonly shortDescription: string | null,
    public readonly description: string | null,
    public readonly imageUrl: string | null,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
