import { Character } from '../../../characters/domain/aggregates/character.js';

/**
 * Total bonus of a skill in the sheet of a character, for the maneuvers of the items (Trading, Crafting): the best of
 * its specializations, or the given one. Undefined when the character does not have the skill.
 */
export const skillBonus = (character: Character | null, skillId: string, specialization?: string | null): number | undefined => {
  if (!character) return undefined;
  const skills = (character.skills || []).filter(
    skill => skill.skillId === skillId && (!specialization || skill.specialization === specialization),
  );
  if (skills.length === 0) return undefined;
  return Math.max(...skills.map(skill => skill.totalBonus || 0));
};
