export class CharacterHP {
  constructor(
    public max: number,
    public current: number,
  ) {}

  static empty(): CharacterHP {
    return new CharacterHP(0, 0);
  }
}
