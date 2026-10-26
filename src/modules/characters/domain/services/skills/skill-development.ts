import { REALM_STAT_TOKEN } from '../../value-objects/character-realm.vo.js';
import type { WeaponDevelopmentType } from '../../value-objects/weapon-development-type.vo.js';
import { SPELLCASTING_COST_KEYS } from '../spells/spell-list-rules.js';

export interface SkillCategoryBonus {
  bonus: string[];
  /** Times the realm stat counts (2 for `R*+R*`), or nothing */
  realmBonus?: number | string | null;
}

/** Stats of a skill: its own, the category ones and, for the realm categories, the realm stat placeholder. */
export function skillStatistics(skillBonus: string[], category: SkillCategoryBonus | undefined): string[] {
  const realmTimes = Number(category?.realmBonus ?? 0) || 0;
  return [...skillBonus, ...(category?.bonus ?? []), ...Array<string>(realmTimes).fill(REALM_STAT_TOKEN)];
}

/** Key of `profession.skillCosts` a skill is developed with. */
export function developmentCostKey(skillId: string, categoryId: string, weaponDevelopment: WeaponDevelopmentType[]): string {
  const combatType = combatDevelopmentType(skillId);
  if (combatType) return `combat${weaponDevelopment.indexOf(combatType) + 1}`;
  return SPELLCASTING_COST_KEYS[skillId] ?? categoryId;
}

function combatDevelopmentType(skillId: string): WeaponDevelopmentType | undefined {
  if (skillId.startsWith('melee-weapon')) return 'melee';
  if (skillId.startsWith('ranged-weapon')) return 'ranged';
  if (skillId === 'shield') return 'shield';
  if (skillId === 'unarmed-st' || skillId === 'unarmed-ag') return 'unarmed';
  return undefined;
}
