export class LevelDownSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
