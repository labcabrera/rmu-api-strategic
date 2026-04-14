import { WeaponDevelopmentType } from './weapon-development-type.vo';

export class CharacterXP {
  constructor(
    public level: number,
    public availableLevel: number,
    public xp: number,
    public devPoints: number,
    public availableDevPoints: number,
    public availableRaceDevPoints: number,
    public weaponDevelopment: WeaponDevelopmentType[],
  ) {}

  static fromLevel(level: number, weaponDevelopment: WeaponDevelopmentType[]): CharacterXP {
    return new CharacterXP(0, level, level * 10000, 0, 0, 0, weaponDevelopment);
  }
}
