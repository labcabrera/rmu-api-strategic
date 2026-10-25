export class ExportFactionQuery {
  constructor(
    public readonly factionId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
