import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class CreateFactionCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string,
    public readonly management: FactionManagement,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
