export type BonusType = 'professional' | 'knack';

export class SetupProfessionSkillBonusCommand {
  constructor(
    public readonly skillId: string,
    public readonly type: BonusType,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
