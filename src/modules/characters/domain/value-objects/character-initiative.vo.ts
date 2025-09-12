export class CharacterInitiative {
  constructor(
    public baseBonus: number,
    public customBonus: number,
    public penaltyBonus: number,
    public totalBonus: number,
  ) {}

  static empty(): CharacterInitiative {
    return new CharacterInitiative(0, 0, 0, 0);
  }
}
