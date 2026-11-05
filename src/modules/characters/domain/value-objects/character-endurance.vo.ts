export class CharacterEndurance {
  constructor(
    public base: number,
    public racialBonus: number,
    public customBonus: number,
    public max: number,
    public current: number,
    public accumulator: number,
    public fatiguePenalty: number,
    /**
     * Workspace spec 079, D2: bonus of the traits to every Endurance roll (Vigorous +10, Feeble -10 per tier). With Body
     * Development and the racial bonus, the endurance bonus of a tactical game. Missing in documents not processed since.
     */
    public traitBonus?: number,
  ) {}

  static empty(): CharacterEndurance {
    return new CharacterEndurance(0, 0, 0, 0, 0, 0, 0, 0);
  }
}
