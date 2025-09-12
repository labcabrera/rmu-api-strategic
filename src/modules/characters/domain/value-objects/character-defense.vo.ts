export class CharacterDefense {
  constructor(
    public defensiveBonus: number,
    public armor: CharacterArmor,
  ) {}

  static empty(): CharacterDefense {
    return new CharacterDefense(0, CharacterArmor.empty());
  }
}

export class CharacterArmor {
  constructor(
    public at: number | undefined,
    public racialAt: number,
    public bodyAt: number | undefined,
    public headAt: number | undefined,
    public armsAt: number | undefined,
    public legsAt: number | undefined,
  ) {}

  static empty(): CharacterArmor {
    return new CharacterArmor(1, 1, undefined, undefined, undefined, undefined);
  }
}
