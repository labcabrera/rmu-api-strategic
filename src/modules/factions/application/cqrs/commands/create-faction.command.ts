export class CreateFactionCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string,
    public readonly availableGold: number | undefined,
    public readonly availableXP: number | undefined,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
