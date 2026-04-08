import { ProfessionalBonusType } from './professional-bonus-type.vo';

export class CharacterSkill {
  constructor(
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly statistics: string[],
    public readonly development: number[],
    public professional: ProfessionalBonusType[] | null,
    public ranks: number,
    public ranksDeveloped: number,
    public statBonus: number,
    public racialBonus: number,
    public developmentBonus: number,
    public professionalBonus: number,
    public customBonus: number,
    public totalBonus: number,
  ) {}

  static empty(skillId: string, specialization: string | null, statistics: string[], development: number[], racialBonus: number) {
    return new CharacterSkill(skillId, specialization, statistics, development, null, 0, 0, 0, racialBonus, 0, 0, 0, 0);
  }
}
