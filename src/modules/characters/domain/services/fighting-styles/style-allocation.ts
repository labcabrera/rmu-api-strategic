import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Character } from '../../aggregates/character.js';
import type { CharacterSkill } from '../../value-objects/character-skill.vo.js';
import { type FightingStyleCatalog, isFightingStyleSkill } from '../../value-objects/fighting-styles.vo.js';

/** Unallocated ranks give +2 OB each, at most +10, while fighting in the style (Character Companion §4.1). */
export const UNALLOCATED_RANK_BONUS = 2;
export const MAX_UNALLOCATED_BONUS = 10;

export const allocatedStyleRanks = (skill: CharacterSkill): number =>
  (skill.styleAbilities || []).reduce((total, selection) => total + selection.cost * selection.times, 0);

export const freeStyleRanks = (skill: CharacterSkill): number => Math.max(0, skill.ranks - allocatedStyleRanks(skill));

export const unallocatedStyleBonus = (freeRanks: number): number => Math.min(MAX_UNALLOCATED_BONUS, UNALLOCATED_RANK_BONUS * freeRanks);

/** Ranks lost (a level down) undo the last selections until the allocated ones fit in the ranks again. */
export const trimStyleAbilities = (skill: CharacterSkill): void => {
  const selections = skill.styleAbilities;
  if (!selections) return;
  while (selections.length > 0 && allocatedStyleRanks(skill) > skill.ranks) {
    const last = selections[selections.length - 1];
    last.times -= 1;
    if (last.times <= 0) selections.pop();
  }
};

// A requirement is a skill id (any specialization) or `skillId@specialization`, with at least one rank
const hasSkill = (character: Character, requirement: string): boolean => {
  const [skillId, specialization] = requirement.split('@');
  return character.skills.some(s => s.skillId === skillId && (!specialization || s.specialization === specialization) && s.ranks > 0);
};

const hasTrait = (character: Character, traitId: string): boolean => (character.traits || []).some(t => t.traitId === traitId);

const styleSkill = (character: Character, skillId: string, specialization: string | null): CharacterSkill => {
  if (!isFightingStyleSkill(skillId)) {
    throw new ValidationError(`Skill ${skillId} is not a fighting style skill`, 'err-not-fighting-style');
  }
  const skill = specialization ? character.findSkill(skillId, specialization) : null;
  if (!skill) throw new ValidationError(`Skill ${skillId}@${specialization} not found`, 'err-skill-not-found');
  return skill;
};

/**
 * Allocates free ranks of a style to one of its abilities (Character Companion §4.1). Selections are permanent:
 * only an administrator removes them, with {@link removeStyleAbility}.
 */
export const allocateStyleAbility = (
  character: Character,
  skillId: string,
  specialization: string | null,
  abilityId: string,
  catalog: FightingStyleCatalog,
): void => {
  const skill = styleSkill(character, skillId, specialization);
  const style = catalog.styles.find(s => s.id === specialization && s.skillId === skillId);
  if (!style) throw new ValidationError(`Fighting style ${specialization} not found`, 'err-fighting-style-not-found');
  const entry = style.abilities.find(a => a.abilityId === abilityId);
  const ability = catalog.abilities.find(a => a.id === abilityId);
  if (!entry || !ability) {
    throw new ValidationError(`Ability ${abilityId} is not part of the style ${style.id}`, 'err-style-ability-not-in-style');
  }
  const selections = skill.styleAbilities || [];
  const current = selections.find(s => s.abilityId === abilityId);
  const times = current?.times ?? 0;
  if (times > 0 && (!ability.repeatable || (ability.maxTimes !== null && times >= ability.maxTimes))) {
    throw new ValidationError(`Ability ${abilityId} cannot be selected again`, 'err-style-ability-repeated');
  }
  if (freeStyleRanks(skill) < entry.cost) {
    throw new ValidationError(`Ability ${abilityId} needs ${entry.cost} free ranks`, 'err-style-ability-ranks');
  }
  const missingAbility = ability.requiresAbilities.find(required => !selections.some(s => s.abilityId === required));
  if (missingAbility) {
    throw new ValidationError(`Ability ${abilityId} requires the ability ${missingAbility}`, 'err-style-ability-requirements');
  }
  const missingSkill = [...style.requiresSkills, ...ability.requiresSkills].find(required => !hasSkill(character, required));
  const missingTrait = [...style.requiresTraits, ...ability.requiresTraits].find(required => !hasTrait(character, required));
  if (missingSkill || missingTrait) {
    throw new ValidationError(`Ability ${abilityId} requires ${missingSkill || missingTrait}`, 'err-style-ability-requirements');
  }
  if (current) {
    current.times += 1;
  } else {
    selections.push({ abilityId, times: 1, cost: entry.cost });
  }
  skill.styleAbilities = selections;
};

/** Undoes one selection of an ability. Administrators only: selections are permanent for players. */
export const removeStyleAbility = (character: Character, skillId: string, specialization: string | null, abilityId: string): void => {
  const skill = styleSkill(character, skillId, specialization);
  const selections = skill.styleAbilities || [];
  const current = selections.find(s => s.abilityId === abilityId);
  if (!current) throw new ValidationError(`Ability ${abilityId} is not selected`, 'err-style-ability-not-selected');
  current.times -= 1;
  skill.styleAbilities = selections.filter(s => s.times > 0);
};
