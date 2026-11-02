import { randomUUID } from 'crypto';
import type { ItemMaterial } from '../value-objects/item-material.vo.js';
import type { ItemModifier, ItemModifierTarget } from '../value-objects/item-modifier.vo.js';
import { type CraftingPlan, MASTERWORK_BONUS, RANGE_INCREMENT_CONDITION } from './crafting-plan.js';
import type { ManeuverResultKey } from './item-repair.js';

/** An improvement the game master adds to a crafted item (workspace spec 023, decision 10), such as +5 to attacks. */
export interface CraftingEnhancement {
  appliesTo: ItemModifierTarget;
  value: number;
  description?: string;
}

/** Effect of an absolute maneuver result of core: the crafting table gives `itemBreakage` ±10 Strength. */
export interface CraftingEffect {
  status: string;
  value?: number;
}

export interface CraftingOutcome {
  /** Whether an item is made: a failure wastes the materials. */
  crafted: boolean;
  modifiers: ItemModifier[];
  /** Workspace spec 043: the material the item keeps. */
  material: ItemMaterial | null;
  /** Workspace spec 043: the superior craftsmanship bonus was achieved. */
  masterwork: boolean;
}

const modifier = (
  appliesTo: ItemModifierTarget,
  value: number,
  description: string | undefined,
  ledgerEntryId: string,
  condition?: string | null,
): ItemModifier => ({
  id: randomUUID(),
  type: 'quality',
  value,
  appliesTo,
  source: { kind: 'crafting', ledgerEntryId },
  ...(description ? { description } : {}),
  ...(condition ? { condition } : {}),
  createdAt: new Date().toISOString(),
});

/**
 * A bonus of the item (material or masterwork) where its kind uses it (workspace spec 043, decision 7): the sheet
 * use, or a conditional modifier for the range increment of a launcher or the circumstance of a masterwork.
 */
const bonusModifier = (
  plan: CraftingPlan,
  value: number,
  description: string,
  ledgerEntryId: string,
  circumstance: string | null = null,
): ItemModifier[] => {
  if (value === 0) return [];
  if (circumstance) return [modifier(plan.bonusTarget ?? 'all', value, description, ledgerEntryId, circumstance)];
  if (plan.kind === 'launcher') return [modifier('all', value, description, ledgerEntryId, RANGE_INCREMENT_CONDITION)];
  return plan.bonusTarget ? [modifier(plan.bonusTarget, value, description, ledgerEntryId)] : [];
};

/**
 * Item made by a crafting maneuver (table 3-9): nothing on a failure; otherwise the improvements of the game master,
 * the Strength change of the result (`quality` applied to breakage checks, as rmu-api-tactical reads it) and
 * (workspace spec 043) the material bonus and durability, the armor weight DB, and the superior craftsmanship bonus,
 * which needs an absolute success.
 */
export const CraftingOutcomes = {
  resolve(
    result: ManeuverResultKey,
    effects: CraftingEffect[],
    enhancements: CraftingEnhancement[],
    ledgerEntryId: string,
    plan: CraftingPlan | null = null,
  ): CraftingOutcome {
    if (result === 'failure' || result === 'absolute-failure') return { crafted: false, modifiers: [], material: null, masterwork: false };
    const strength = effects.filter(effect => effect.status === 'itemBreakage' && typeof effect.value === 'number');
    const masterwork = !!plan?.masterwork && result === 'absolute-success';
    const quality: ItemModifier[] = plan
      ? [
          ...(plan.material ? bonusModifier(plan, plan.material.bonus, 'material', ledgerEntryId) : []),
          ...(plan.material?.durability ? [modifier('breakage', plan.material.durability, 'material-durability', ledgerEntryId)] : []),
          ...(plan.weightDb ? [modifier('defense', plan.weightDb, 'armor-weight', ledgerEntryId)] : []),
          ...(masterwork ? bonusModifier(plan, MASTERWORK_BONUS, 'masterwork', ledgerEntryId, plan.circumstance) : []),
        ]
      : [];
    return {
      crafted: true,
      modifiers: [
        ...enhancements.map(enhancement => modifier(enhancement.appliesTo, enhancement.value, enhancement.description, ledgerEntryId)),
        ...quality,
        ...strength.map(effect => modifier('breakage', effect.value!, `crafting-${result}`, ledgerEntryId)),
      ],
      material: plan?.material
        ? { id: plan.material.id, bonus: plan.material.bonus, durability: plan.material.durability, magical: plan.material.magical }
        : null,
      masterwork,
    };
  },

  /** What the ledger keeps of how the item was made (workspace spec 043, decision 12). */
  summary(plan: CraftingPlan, outcome: CraftingOutcome): Record<string, unknown> {
    return {
      kind: plan.kind,
      materialId: plan.material?.id ?? null,
      materialBonus: plan.material?.bonus ?? null,
      masterwork: plan.masterwork,
      ...(plan.circumstance ? { circumstance: plan.circumstance } : {}),
      masterworkAchieved: outcome.masterwork,
      weightPercent: plan.weightPercent,
      workshop: plan.workshop,
      productionHours: plan.productionHours,
      cost: plan.cost,
    };
  },
};
