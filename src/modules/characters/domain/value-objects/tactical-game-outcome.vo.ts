import { CharacterCondition } from './character-condition.vo';
import { Injury } from './injury.vo';
import type { ItemModifier } from 'src/modules/items/domain/value-objects/item-modifier.vo';

export type TacticalFate = 'dead' | 'permanent-unconscious';

/** Where a change of hits of a tactical game comes from (spec 013, §1.1). */
export type TacticalHpLogKind = 'attack' | 'critical' | 'fumble' | 'bleeding' | 'endurance' | 'treatment' | 'manual';
export const TACTICAL_HP_LOG_KINDS: TacticalHpLogKind[] = ['attack', 'critical', 'fumble', 'bleeding', 'endurance', 'treatment', 'manual'];

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
}

/** One element of TacticalGameOutcome.characters (rmu-api-tactical), applied to a strategic character. */
export interface TacticalCharacterOutcome {
  tacticalGameId: string;
  tacticalGameName?: string;
  actorId: string;
  characterId: string;
  name: string;
  hp: { start: number; end: number; delta: number };
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
}
