export class AddXPCommand {
  constructor(
    public readonly characterId: string,
    public readonly xp: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
