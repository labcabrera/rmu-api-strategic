export class GetHealingLogQuery {
  constructor(
    public readonly characterId: string,
    public readonly page: number,
    public readonly size: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
