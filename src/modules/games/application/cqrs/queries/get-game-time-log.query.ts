export class GetGameTimeLogQuery {
  constructor(
    public readonly gameId: string,
    public readonly page: number,
    public readonly size: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
