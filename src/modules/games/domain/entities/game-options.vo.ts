export class GameOptions {
  constructor(
    public readonly experienceMultiplier: number,
    public readonly fatigueMultiplier: number,
    public readonly boardScaleMultiplier: number,
    public readonly letality: number,
  ) {}
}
