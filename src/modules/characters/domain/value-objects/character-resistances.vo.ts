export class CharacterResistance {
  totalBonus: number;
  constructor(
    public resistance: string,
    public statBonus: number,
    public racialBonus: number,
    public realmBonus: number,
    public customBonus: number,
    public traitBonus: number = 0,
  ) {
    this.totalBonus = statBonus + racialBonus + realmBonus + customBonus + traitBonus;
  }
}
