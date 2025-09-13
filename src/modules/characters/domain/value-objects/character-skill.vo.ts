import { ProfessionalBonusType } from './professional-bonus-type.vo';

export class CharacterSkill {
  constructor(
    public readonly skillId: string,
    public readonly specialization: string | undefined,
    public readonly statistics: string[],
    public readonly development: number[],
    public professional: ProfessionalBonusType[] | undefined,
    public ranks: number,
    public ranksDeveloped: number,
    public statBonus: number,
    public racialBonus: number,
    public developmentBonus: number,
    public professionalBonus: number,
    public customBonus: number,
    public totalBonus: number,
  ) {}

  static empty(
    skillId: string,
    specialization: string | undefined,
    statistics: string[],
    development: number[],
    racialBonus: number,
  ) {
    return new CharacterSkill(
      skillId,
      specialization,
      statistics,
      development,
      undefined,
      0,
      0,
      0,
      racialBonus,
      0,
      0,
      0,
      0,
    );
  }
}
