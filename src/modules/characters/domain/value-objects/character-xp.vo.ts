import { WeaponDevelopmentType } from '../aggregates/character.aggregate';

export class CharacterXP {
  constructor(
    public level: number,
    public availableLevel: number,
    public xp: number,
    public developmentPoints: number,
    public availableDevelopmentPoints: number,
    public weaponDevelopment: WeaponDevelopmentType[],
  ) {}

  static fromLevel(level: number, weaponDevelopment: WeaponDevelopmentType[]): CharacterXP {
    return new CharacterXP(0, level, level * 10000, 0, 0, weaponDevelopment);
  }
}
