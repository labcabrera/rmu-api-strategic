export interface SkillCategoryClientPort {
  getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse>;

  getAllSkillCategories(): Promise<SkillCategoryResponse[]>;
}

export interface SkillCategoryResponse {
  id: string;
  bonus: string[];
}
