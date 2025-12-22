import { Page } from 'src/modules/shared/domain/entities/page.entity';

export interface SkillClientPort {
  getAllSkills(): Promise<Page<SkillResponse>>;

  getSkillById(skillId: string): Promise<SkillResponse>;
}

export interface SkillResponse {
  id: string;
  categoryId: string;
  bonus: string[];
  specializations: string[];
}
