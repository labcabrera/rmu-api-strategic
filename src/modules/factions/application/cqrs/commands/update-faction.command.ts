import { FactionManagement } from 'src/modules/factions/domain/value-objects/faction-management.vo';

export class UpdateFactionCommand {
  constructor(
    public readonly factionId: string,
    public readonly name: string,
    public readonly management: FactionManagement | undefined,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
