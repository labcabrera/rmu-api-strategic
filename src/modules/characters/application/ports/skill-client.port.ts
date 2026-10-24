import { Page } from '../../../shared/application/pagination/page';

export interface SkillClientPort {
  getAllSkills(): Promise<Page<SkillResponse>>;

  getSkillById(skillId: string): Promise<SkillResponse>;
}

export const SKILL_CLIENT = Symbol('SkillClientPort');

export interface SkillResponse {
  id: string;
  categoryId: string;
  bonus: string[];
  specialization: string | undefined;
}
