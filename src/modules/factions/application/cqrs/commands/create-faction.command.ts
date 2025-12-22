import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';

export class CreateFactionCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string,
    public readonly management: FactionManagement,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
