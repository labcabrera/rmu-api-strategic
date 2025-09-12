export interface CharacterDefense {
  defensiveBonus: number;
  armor: CharacterArmor;
}

export interface CharacterArmor {
  at: number | undefined;
  racialAt: number;
  bodyAt: number | undefined;
  headAt: number | undefined;
  armsAt: number | undefined;
  legsAt: number | undefined;
}
