import { randomUUID } from 'crypto';
import type { ItemCondition, ItemModifier } from '../value-objects/item-modifier.vo.js';
import { ItemModifiers } from '../value-objects/item-modifier.vo.js';

export type ManeuverResultKey = 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';

/** Penalty of a repair roll on an item broken outright (§6.2). */
export const BROKEN_REPAIR_PENALTY = -100;
/** Permanent penalty left by a successful repair of a broken item (table 6-2). */
export const BROKEN_REPAIRED_PENALTY = -10;

/** Outcome keys of a repair, translated by the clients. */
export type RepairOutcome =
  | 'broken'
  | 'unrepairable'
  | 'unchanged'
  | 'halved'
  | 'cannot-fix-broken'
  | 'repaired'
  | 'repaired-with-penalty'
  | 'as-new'
  | 'jury-rigged-working'
  | 'jury-rigged-useless';

export interface RepairResult {
  outcome: RepairOutcome;
  /** The breakage modifiers the item keeps. */
  breakage: ItemModifier[];
  unrepairable: boolean;
}

const breakageModifier = (value: number, broken: boolean, description: string, ledgerEntryId: string | undefined): ItemModifier => ({
  id: randomUUID(),
  type: 'breakage',
  value,
  appliesTo: 'all',
  ...(broken ? { broken: true } : {}),
  source: { kind: 'repair', ...(ledgerEntryId ? { ledgerEntryId } : {}) },
  description,
  createdAt: new Date().toISOString(),
});

/**
 * Applies the result of a repair roll (table 6-2) to the breakage modifiers of an item (workspace spec 023, decision
 * 11). The other modifiers are not touched. An unmodified 66 leaves the item jury-rigged: working with a partial
 * success or better, not working at all otherwise (a broken breakage modifier that explains it).
 */
export const ItemRepair = {
  /** Modifier of the repair roll for the damage of the item: its breakage penalty, or -100 if it is broken. */
  rollPenalty(condition: ItemCondition): number {
    return condition.broken ? BROKEN_REPAIR_PENALTY : condition.breakagePenalty;
  },

  apply(modifiers: ItemModifier[], result: ManeuverResultKey, unusualEvent: boolean, ledgerEntryId?: string): RepairResult {
    const breakage = modifiers.filter(modifier => modifier.type === 'breakage');
    const condition = ItemModifiers.condition(modifiers);
    const succeeded = result === 'partial-success' || result === 'success' || result === 'absolute-success';

    if (unusualEvent) {
      if (succeeded) return { outcome: 'jury-rigged-working', breakage: [], unrepairable: false };
      return {
        outcome: 'jury-rigged-useless',
        breakage: [...breakage, breakageModifier(0, true, 'jury-rigged', ledgerEntryId)],
        unrepairable: false,
      };
    }

    switch (result) {
      case 'absolute-success':
        return { outcome: 'as-new', breakage: [], unrepairable: false };
      case 'success':
        if (condition.broken) {
          return {
            outcome: 'repaired-with-penalty',
            breakage: [breakageModifier(BROKEN_REPAIRED_PENALTY, false, 'repaired-broken', ledgerEntryId)],
            unrepairable: false,
          };
        }
        return { outcome: 'repaired', breakage: [], unrepairable: false };
      case 'partial-success': {
        if (condition.broken) return { outcome: 'cannot-fix-broken', breakage, unrepairable: false };
        // Half the damage, rounded toward zero, as one modifier that replaces the old ones.
        const halved = Math.trunc(condition.breakagePenalty / 2);
        return {
          outcome: 'halved',
          breakage: halved < 0 ? [breakageModifier(halved, false, 'partial-repair', ledgerEntryId)] : [],
          unrepairable: false,
        };
      }
      case 'failure':
        return { outcome: 'unchanged', breakage, unrepairable: false };
      case 'absolute-failure':
        if (condition.broken) return { outcome: 'unrepairable', breakage, unrepairable: true };
        return {
          outcome: 'broken',
          breakage: [...breakage, breakageModifier(0, true, 'repair-failure', ledgerEntryId)],
          unrepairable: false,
        };
    }
  },
};
