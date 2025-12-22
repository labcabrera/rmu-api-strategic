export class AddItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly name: string | undefined,
    public readonly itemTypeId: string,
    public readonly weight: number | undefined,
    public readonly strength: number | undefined,
    public readonly cost: number | undefined,
    public readonly amount: number | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
