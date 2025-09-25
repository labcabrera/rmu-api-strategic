export class DeleteTraitCommand {
  constructor(
    public readonly characterId: string,
    public readonly traitId: string,
    public readonly value: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
