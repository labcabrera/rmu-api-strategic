export class AddTraitCommand {
  constructor(
    public readonly characterId: string,
    public readonly traitId: string,
    public readonly tier: number | undefined,
    public readonly specialization: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
