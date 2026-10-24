import { Page } from '../../../shared/domain/entities/page';

export interface SkillClientPort {
  getAllSkills(): Promise<Page<SkillResponse>>;

  getSkillById(skillId: string): Promise<SkillResponse>;
}

export interface SkillResponse {
  id: string;
  categoryId: string;
  bonus: string[];
  specialization: string | undefined;
}
