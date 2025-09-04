export class TransferGoldCommand {
  constructor(
    public readonly characterId: string,
    public readonly amount: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
