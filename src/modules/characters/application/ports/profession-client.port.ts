export interface ProfessionClientPort {
  getProfessionById(professionId: string): Promise<Profession | undefined>;
}

export const PROFESSION_CLIENT = Symbol('ProfessionClientPort');
export interface Profession {
  id: string;
  skillCosts: Record<string, number[]>;
  professionalSkills: string[];
  /** Realms of a spellcaster profession (two for a hybrid) */
  fixedRealmTypes?: string[];
  /** Realms an arms profession may choose one from */
  availableRealmTypes?: string[];
}
