import { randomUUID } from 'crypto';
import type { ItemModifier, ItemModifierTarget } from '../value-objects/item-modifier.vo.js';
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
}

const qualityModifier = (
  appliesTo: ItemModifierTarget,
  value: number,
  description: string | undefined,
  ledgerEntryId: string,
): ItemModifier => ({
  id: randomUUID(),
  type: 'quality',
  value,
  appliesTo,
  source: { kind: 'crafting', ledgerEntryId },
  ...(description ? { description } : {}),
  createdAt: new Date().toISOString(),
});

/**
 * Item made by a crafting maneuver (table 3-9): nothing on a failure; otherwise the improvements of the game master,
 * plus the Strength change of the result (`quality` applied to breakage checks, as rmu-api-tactical reads it).
 */
export const CraftingOutcomes = {
  resolve(
    result: ManeuverResultKey,
    effects: CraftingEffect[],
    enhancements: CraftingEnhancement[],
    ledgerEntryId: string,
  ): CraftingOutcome {
    if (result === 'failure' || result === 'absolute-failure') return { crafted: false, modifiers: [] };
    const strength = effects.filter(effect => effect.status === 'itemBreakage' && typeof effect.value === 'number');
    return {
      crafted: true,
      modifiers: [
        ...enhancements.map(enhancement =>
          qualityModifier(enhancement.appliesTo, enhancement.value, enhancement.description, ledgerEntryId),
        ),
        ...strength.map(effect => qualityModifier('breakage', effect.value!, `crafting-${result}`, ledgerEntryId)),
      ],
    };
  },
};
