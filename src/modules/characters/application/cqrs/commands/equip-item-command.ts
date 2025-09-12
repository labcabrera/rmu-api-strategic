export class EquipItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    public readonly slot: string,
    public readonly userId: string,
    public readonly userRoles: string[],
  ) {}
}
