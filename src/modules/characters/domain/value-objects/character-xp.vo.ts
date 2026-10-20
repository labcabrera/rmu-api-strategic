import { WeaponDevelopmentType } from './weapon-development-type.vo';

export class CharacterXP {
  constructor(
    public level: number,
    public availableLevel: number,
    public xp: number,
    // Development points granted at every level up (level 1 included)
    public devPoints: number,
    public availableDevPoints: number,
    // Bonus pool: race extra development points plus the game master creation bonus. Unspent points are kept between levels
    public availableBonusDevPoints: number,
    public availableStatLevelUp: number,
    public developedStatLevelUp: number,
    public weaponDevelopment: WeaponDevelopmentType[],
    // Bonus development points spent in the current level, limited by the power level raceDevPointsPerLevel
    public bonusDevPointsSpentThisLevel: number = 0,
    // Points returned by flaws at creation under the 'flaw-points-at-creation' talent policy. They only pay talents
    public flawDevPoints: number = 0,
  ) {}

  static fromLevel(level: number, weaponDevelopment: WeaponDevelopmentType[]): CharacterXP {
    return new CharacterXP(0, level, level * 10000, 0, 0, 0, 0, 0, weaponDevelopment, 0, 0);
  }
}

// Character creation spans level 0 and level 1, until the first level up from level 1
export const isCreationLevel = (level: number): boolean => level <= 1;
