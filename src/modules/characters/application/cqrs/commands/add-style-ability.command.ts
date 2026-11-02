export class AddStyleAbilityCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string,
    public readonly abilityId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
