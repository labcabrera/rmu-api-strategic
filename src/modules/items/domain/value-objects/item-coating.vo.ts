import type { PoisonData, PoisonForm } from '../../../characters/domain/value-objects/poison.vo.js';

/**
 * Poison on a weapon (workspace spec 042, decision 11): the next hit in a tactical game spends it, and a critical
 * exposes the target. `hoursLeft` is how long it lasts; the game master removes it when it dries.
 */
export interface ItemCoating {
  itemTypeId?: string;
  name: string;
  poison: PoisonData;
  appliedAt: string;
  hoursLeft?: number | null;
}

/** Forms that coat a weapon, and the hours they last: a liquid an hour, a paste a week. */
export const COATING_HOURS: Partial<Record<PoisonForm, number>> = { liquid: 1, paste: 168 };
