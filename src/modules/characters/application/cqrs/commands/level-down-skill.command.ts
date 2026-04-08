export class LevelDownSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
