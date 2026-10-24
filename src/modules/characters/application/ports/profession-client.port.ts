export interface ProfessionClientPort {
  getProfessionById(professionId: string): Promise<Profession>;
}

export const PROFESSION_CLIENT = Symbol('ProfessionClientPort');
export interface Profession {
  id: string;
  skillCosts: Record<string, number[]>;
  professionalSkills: string[];
}
