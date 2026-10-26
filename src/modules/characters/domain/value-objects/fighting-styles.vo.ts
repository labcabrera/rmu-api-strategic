/** Skills whose specializations are the fighting styles (workspace spec 032). */
export const FIGHTING_STYLE_SKILLS = ['battle-styles', 'combat-styles', 'discipline-styles'];

export const isFightingStyleSkill = (skillId: string): boolean => FIGHTING_STYLE_SKILLS.includes(skillId);

/** Ranks of a fighting style allocated to one of its abilities. `cost` is the ranks of each time it was selected. */
export interface StyleAbilitySelection {
  abilityId: string;
  times: number;
  cost: number;
}

/** Fighting styles of rmu-api-core (GET /v1/fighting-styles), with the fields this API reads. */
export interface FightingStyleCatalog {
  styles: FightingStyle[];
  abilities: StyleAbility[];
}

export interface FightingStyle {
  id: string;
  skillId: string;
  abilities: { abilityId: string; cost: number }[];
  requiresSkills: string[];
  requiresTraits: string[];
}

export interface StyleAbility {
  id: string;
  repeatable: boolean;
  maxTimes: number | null;
  requiresAbilities: string[];
  requiresSkills: string[];
  requiresTraits: string[];
}
