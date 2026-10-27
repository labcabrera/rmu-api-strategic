/** Cost of an item type in the catalog, in gold pieces. */
export interface ItemCost {
  min: number | null;
  average: number | null;
  max: number | null;
}

/**
 * What an instance keeps of its catalog item type (workspace spec 023, decision 2): a copy taken when it is created,
 * so later catalog edits do not change an item that has been customized. Items stored before spec 023 have none.
 */
export interface ItemCatalogInfo {
  cost: ItemCost | null;
  rarity: string | null;
  productionHours: number | null;
  imageUrl: string | null;
  /** Workspace spec 041: units of the lot the book sells (cost and weight are per unit). */
  lotSize?: number | null;
  /** Workspace spec 041: container, light, transport or ammunition data of the type, as information. */
  features?: ItemFeatures | null;
}

/** The general equipment blocks of the catalog (workspace spec 041, decision 4). */
export interface ItemFeatures {
  container?: { weight: number | null; volume: number | null; liquid: number | null; units: number | null } | null;
  light?: { radius: number | null; durationHours: number | null } | null;
  transport?: { capacity: number | null; speed: number | null } | null;
  ammunition?: { launchers: string[]; sizeAdjustment: number } | null;
}
