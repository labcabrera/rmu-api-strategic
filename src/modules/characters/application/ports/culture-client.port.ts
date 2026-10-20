export interface CultureClientPort {
  getCultureById(cultureId: string): Promise<Culture>;
}

export type CultureSkillRankType = 'skill' | 'skill-choice' | 'category-pool' | 'languages' | 'region';

export interface CultureSkillRank {
  type: CultureSkillRankType;
  // 'skill' and 'region'
  skillId?: string;
  // 'skill-choice': the skills the player can choose from
  skillIds?: string[];
  // 'skill': fixed specialization
  specialization?: string;
  // 'category-pool'
  categoryIds?: string[];
  ranks: number;
  // Defaults: 2 for 'skill-choice' and 'category-pool', unlimited for 'languages' and 'region'
  maxRanksPerSkill?: number;
  region?: 'own' | 'neighboring';
}

export interface Culture {
  id: string;
  name: string;
  skillRanks: CultureSkillRank[];
  // Languages offered by the culture. Empty or missing: every language
  languages?: string[];
}
