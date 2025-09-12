export class SetUpProfessionalSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
