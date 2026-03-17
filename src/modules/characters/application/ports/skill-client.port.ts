import { Page } from 'src/modules/shared/domain/entities/page';

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
