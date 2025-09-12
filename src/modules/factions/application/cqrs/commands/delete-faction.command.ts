export class DeleteFactionCommand {
  constructor(
    public readonly factionId: string,
    public readonly reason: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
