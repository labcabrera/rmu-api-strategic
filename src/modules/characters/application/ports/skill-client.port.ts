export interface SkillClientPort {
  getAllSkills(): Promise<SkillResponse[]>;

  getSkillById(skillId: string): Promise<SkillResponse>;
}

export interface SkillResponse {
  id: string;
  categoryId: string;
  bonus: string[];
  specializations: string[];
}
