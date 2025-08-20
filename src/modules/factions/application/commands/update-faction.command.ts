export class UpdateFactionCommand {
  constructor(
    public readonly factionId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
