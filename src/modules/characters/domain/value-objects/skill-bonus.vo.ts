export class SkillBonus {
  constructor(
    public skillId: string,
    public specialization: string | null,
    public bonus: number,
  ) {}
}
