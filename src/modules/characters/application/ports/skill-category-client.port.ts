export interface SkillCategoryClientPort {
  getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse>;

  getAllSkillCategories(): Promise<SkillCategoryResponse[]>;
}

export const SKILL_CATEGORY_CLIENT = Symbol('SkillCategoryClientPort');

export interface SkillCategoryResponse {
  id: string;
  bonus: string[];
  /** Times the realm stat counts in the category (2 for Spellcasting and Power Manipulation, `R*+R*`) */
  realmBonus?: number | null;
}
