import type { Difficulty } from '../../../characters/domain/value-objects/difficulty.vo.js';
import { ItemWeapon } from '../../domain/value-objects/item-weapon.vo.js';

export interface ItemClientPort {
  /** undefined when the items API has no such item type. */
  getItemById(itemId: string): Promise<ItemResponse | undefined>;
}

export const ITEM_CLIENT = Symbol('ItemClientPort');

export interface ItemResponse {
  id: string;
  /** Spec 023: the catalog fields an instance copies (missing in the test doubles of before). */
  name?: string;
  category: string;
  weapon: ItemWeapon | null;
  armor: ItemArmorResponse | null;
  shield: ItemShieldResponse | null;
  info: ItemInfoResponse;
  modifiers?: ItemCatalogModifierResponse[] | null;
  description?: string | null;
  imageUrl?: string | null;
}

/** A modifier of the catalog type: `bonus`, `skill-bonus`, `material`, `slayer`... */
export interface ItemCatalogModifierResponse {
  id?: string;
  type: string;
  modifier?: string | null;
  value?: number | null;
}

export interface ItemInfoResponse {
  cost: ItemCost | null;
  length: number | null;
  strength: number | null;
  weight: number | null;
  productionHours: number | undefined;
  stackable: boolean | undefined;
  rarity?: string | null;
  unique?: boolean;
}

export interface ItemCost {
  min: number | null;
  average: number | null;
  max: number | null;
}

export interface ItemArmorResponse {
  slot: string;
  at: number;
  enc: number;
  maneuverPenalty: number;
  rangedPenalty: number;
  perceptionPenalty: number;
  baseDifficulty: Difficulty;
}

export interface ItemShieldResponse {
  db: number;
  blockCount: number;
}

export interface ItemWeaponRangeResponse {
  from: number;
  to: number;
  bonus: number;
}
