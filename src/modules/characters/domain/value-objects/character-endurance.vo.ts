export class CharacterEndurance {
  constructor(
    public base: number,
    public racialBonus: number,
    public customBonus: number,
    public max: number,
    public current: number,
    public accumulator: number,
    public fatiguePenalty: number,
  ) {}

  static empty(): CharacterEndurance {
    return new CharacterEndurance(0, 0, 0, 0, 0, 0, 0);
  }
}
