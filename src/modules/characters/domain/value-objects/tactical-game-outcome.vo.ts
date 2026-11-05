import type { CharacterCondition } from './character-condition.vo.js';
import type { Injury } from './injury.vo.js';
import type { TemporaryModifier } from './temporary-modifier.vo.js';
import type { ItemModifier } from '../../../items/domain/value-objects/item-modifier.vo.js';

export type TacticalFate = 'dead' | 'permanent-unconscious';

/** Where a change of hits of a tactical game comes from (spec 013, §1.1). */
export type TacticalHpLogKind =
  | 'attack'
  | 'critical'
  | 'fumble'
  | 'bleeding'
  | 'endurance'
  | 'treatment'
  | 'manual'
  | 'poison'
  // Workspace spec 077, D1: falls and falling objects
  | 'hazard';
export const TACTICAL_HP_LOG_KINDS: TacticalHpLogKind[] = [
  'attack',
  'critical',
  'fumble',
  'bleeding',
  'endurance',
  'treatment',
  'manual',
  'poison',
  'hazard',
];

/** A change of the hits of an actor in a tactical game (spec 013, §1.1): negative is damage, positive healing. */
export interface TacticalHpLogEntry {
  id: string;
  round: number;
  phase?: number;
  amount: number;
  kind: TacticalHpLogKind;
  actionId?: string;
  attackerId?: string;
  attackerName?: string;
  injuryId?: string;
  criticalKey?: string;
  at: string;
}

/** Totals of the hits log of a character by kind and by attacker. */
export interface TacticalHpBySource {
  byKind: Partial<Record<TacticalHpLogKind, number>>;
  byAttacker: Array<{ attackerId: string; attackerName?: string; amount: number }>;
}

/** Modifiers an item of the character got in the game (spec 019): breakage damage, not the temporary one. */
export interface TacticalItemOutcome {
  itemId: string;
  name?: string;
  modifiers: ItemModifier[];
  /**
   * The poison on the weapon was spent in the game (workspace spec 042): the `appliedAt` of the coating it was spent
   * from (spec 044, decision 3), or `true` from a tactical that predates it.
   */
  coatingSpent?: TacticalCoatingSpent;
}

/** The coating spent in a tactical game, by its `appliedAt`; `true` is the legacy form, without identity. */
export type TacticalCoatingSpent = true | { appliedAt: string };

/** One element of TacticalGameOutcome.characters (rmu-api-tactical), applied to a strategic character. */
export interface TacticalCharacterOutcome {
  tacticalGameId: string;
  tacticalGameName?: string;
  actorId: string;
  characterId: string;
  name: string;
  hp: { start: number; end: number; delta: number };
  /**
   * Workspace spec 077, D10: the fatigue penalty of the actor at the start and end of the game (points, 0-50) and its
   * change, which strategic adds to `endurance.fatiguePenalty`. Missing in older outcomes: the fatigue is kept.
   */
  fatigue?: { start: number; end: number; delta: number };
  /** Every change of the hits in the game. Only its totals and size are kept, in the healing log. */
  hpLog?: TacticalHpLogEntry[];
  hpBySource?: TacticalHpBySource;
  /** Final state of every injury of the actor */
  injuries: Injury[];
  injuriesAdded: string[];
  injuriesUpdated: string[];
  injuriesHealed: string[];
  conditions: CharacterCondition[];
  /** Conditions of the character (snapshot) that ended during the game */
  conditionsResolved?: string[];
  fate?: TacticalFate;
  /** Spec 019: missing in outcomes of tactical versions before it. */
  items?: TacticalItemOutcome[];
  /** Workspace spec 068: units of items spent in the game (herbs, potions); missing in older outcomes */
  itemsConsumed?: TacticalItemConsumed[];
  /** Workspace spec 068: the temporary modifiers created in the game; missing in older outcomes */
  temporaryModifiers?: TemporaryModifier[];
}

/** Workspace spec 068: units of an item of the character spent in a tactical game. */
export interface TacticalItemConsumed {
  itemId: string;
  amount: number;
}
