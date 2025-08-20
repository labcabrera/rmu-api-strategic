export interface ProfessionClient {
  getProfessionById(professionId: string): Promise<ProfessionResponse | undefined>;
}
export interface ProfessionResponse {
  id: string;
  skillCosts: ProfessionSkillCosts;
  professionalSkills: string[];
}

export interface ProfessionSkillCosts {
  animal: number[];
  awareness: number[];
  battleExpertise: number[];
  bodyDiscipline: number[];
  brawn: number[];
  combatExpertise: number[];
  combat1: number[];
  combat2: number[];
  combat3: number[];
  combat4: number[];
  composition: number[];
  crafting: number[];
  delving: number[];
  environmental: number[];
  gymnastic: number[];
  lore: number[];
  magicalExpertise: number[];
  medical: number[];
  mentalDiscipline: number[];
  movement: number[];
  performanceArt: number[];
  powerManipulation: number[];
  science: number[];
  social: number[];
  spellsBaseOpen: number[];
  spellsRitualMagic: number[];
  spellsClosed: number[];
  spellsArcane: number[];
  spellsRestricted: number[];
  subterfuge: number[];
  technical: number[];
  vocation: number[];
}
