export class ItemArmor {
  constructor(
    public readonly slot: string,
    public readonly at: number,
    public readonly enc: number,
    public readonly maneuver: number,
    public readonly rangedPenalty: number,
    public readonly perception: number,
    public readonly baseDifficulty: string,
  ) {}
}
