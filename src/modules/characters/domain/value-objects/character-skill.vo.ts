import type { ProfessionalBonusType } from './professional-bonus-type.vo.js';

// Development points spent on the ranks developed in the current level, by pool
export interface SkillDevPointsSpent {
  normal: number;
  bonus: number;
}

export class CharacterSkill {
  constructor(
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly statistics: string[],
    public readonly development: number[],
    public professional: ProfessionalBonusType[] | null,
    // Total ranks: culture ranks plus developed ranks
    public ranks: number,
    public ranksDeveloped: number,
    public statBonus: number,
    public racialBonus: number,
    public developmentBonus: number,
    public professionalBonus: number,
    public customBonus: number,
    public totalBonus: number,
    public traitBonus: number = 0,
    // Ranks granted by the culture before level 1. They cost no points and are not removed by a level down
    public cultureRanks: number = 0,
    public devPointsSpent: SkillDevPointsSpent = { normal: 0, bonus: 0 },
    // Knack bonus taken from the game power level when the knack was assigned
    public knackBonus?: number,
  ) {}

  static empty(skillId: string, specialization: string | null, statistics: string[], development: number[], racialBonus: number) {
    return new CharacterSkill(skillId, specialization, statistics, development, null, 0, 0, 0, racialBonus, 0, 0, 0, 0, 0, 0, {
      normal: 0,
      bonus: 0,
    });
  }
}
