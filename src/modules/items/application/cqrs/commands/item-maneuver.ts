import type { Difficulty } from '../../../../characters/domain/value-objects/difficulty.vo.js';

/** The roll of a crafting or repair maneuver (an absolute maneuver of core). */
export interface ItemManeuverRequest {
  /** Character who rolls; its sheet gives the skill bonus. */
  actorId?: string;
  skillId?: string;
  specialization?: string | null;
  /** Skill bonus typed by hand: an NPC craftsman, or a correction of the game master. */
  bonus?: number;
  difficulty?: Difficulty;
  modifiers?: { key: string; value: number }[];
  roll: number;
  unmodifiedRoll?: number;
}
