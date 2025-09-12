export class CharacterResistance {
  totalBonus: number;
  constructor(
    public resistance: string,
    public statBonus: number,
    public racialBonus: number,
    public realmBonus: number,
    public customBonus: number,
  ) {
    this.totalBonus = statBonus + racialBonus + realmBonus + customBonus;
  }
}
