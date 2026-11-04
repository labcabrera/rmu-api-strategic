import type { StatKey } from './character-stat.vo.js';
import type { WeaponDevelopmentType } from './weapon-development-type.vo.js';

/** The skill a character trains intensely in the current level (workspace spec 076, A1). */
export interface IntenseTrainingSkill {
  skillId: string;
  specialization: string | null;
}

/** Development points paid for an extra stat gain roll (workspace spec 076, A4). */
export interface StatGainPayment {
  stat: StatKey;
  normal: number;
  bonus: number;
  level: number;
}

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
    // Workspace spec 076, A1: the only skill that may take more than two ranks in the current level
    public intenseTrainingSkill: IntenseTrainingSkill | null = null,
    // Workspace spec 076, A5: normal points saved at the previous level up, already included in availableDevPoints
    public savedDevPoints: number = 0,
    // Workspace spec 076, A4: extra stat gain rolls paid with development points, of the last two levels
    public statGainPayments: StatGainPayment[] = [],
  ) {}

  static fromLevel(level: number, weaponDevelopment: WeaponDevelopmentType[]): CharacterXP {
    return new CharacterXP(0, level, level * 10000, 0, 0, 0, 0, 0, weaponDevelopment, 0, 0, null, 0, []);
  }
}

// Character creation spans level 0 and level 1, until the first level up from level 1
export const isCreationLevel = (level: number): boolean => level <= 1;
