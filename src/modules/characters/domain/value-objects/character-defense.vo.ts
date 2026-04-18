export class CharacterDefense {
  constructor(
    public defensiveBonus: number,
    public armor: CharacterArmor,
    public shield: CharacterShield | null,
    public protect: number,
  ) {}

  static empty(): CharacterDefense {
    return new CharacterDefense(0, CharacterArmor.empty(), null, 0);
  }
}

export class CharacterArmor {
  constructor(
    public at: number | null,
    public racialAt: number,
    public bodyAt: number | null,
    public headAt: number | null,
    public armsAt: number | null,
    public legsAt: number | null,
  ) {}

  static empty(): CharacterArmor {
    return new CharacterArmor(1, 1, null, null, null, null);
  }
}

export class CharacterShield {
  constructor(
    public db: number,
    public blockCount: number,
  ) {}
}
