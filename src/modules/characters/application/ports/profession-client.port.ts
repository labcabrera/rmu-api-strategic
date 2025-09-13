export interface ProfessionClientPort {
  getProfessionById(professionId: string): Promise<Profession>;
}
export interface Profession {
  id: string;
  skillCosts: Record<string, number[]>;
  professionalSkills: string[];
}
