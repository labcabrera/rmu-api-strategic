export class UnequipItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly slot: string,
    public readonly userId: string,
    public readonly userRoles: string[],
  ) {}
}
