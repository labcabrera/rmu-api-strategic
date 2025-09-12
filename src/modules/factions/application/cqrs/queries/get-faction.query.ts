export class GetFactionQuery {
  constructor(
    public readonly factionId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
