// Resistance rolls get +2 for every character level
export const RESISTANCE_BONUS_PER_LEVEL = 2;

export class CharacterResistance {
  totalBonus: number;
  constructor(
    public resistance: string,
    public statBonus: number,
    public racialBonus: number,
    public realmBonus: number,
    public customBonus: number,
    public traitBonus: number = 0,
    public levelBonus: number = 0,
  ) {
    this.totalBonus = statBonus + racialBonus + realmBonus + customBonus + traitBonus + levelBonus;
  }
}
