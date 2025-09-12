import { ProfessionalBonusType } from './professional-bonus-type.vo';

export interface CharacterSkill {
  skillId: string;
  specialization: string | undefined;
  statistics: string[];
  professional: ProfessionalBonusType[] | undefined;
  ranks: number;
  statBonus: number;
  racialBonus: number;
  developmentBonus: number;
  professionalBonus: number;
  customBonus: number;
  totalBonus: number;
}
