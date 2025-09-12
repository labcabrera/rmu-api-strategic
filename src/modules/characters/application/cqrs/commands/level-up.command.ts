export class LevelUpCommand {
  constructor(
    public readonly characterId: string,
    public readonly force: boolean,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
