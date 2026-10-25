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
}
