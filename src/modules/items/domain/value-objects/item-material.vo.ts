/**
 * Superior material an item was crafted of (workspace spec 043, decision 8): what it gave, kept as information for
 * the sheet and for a later enchantment. The bonus and the durability are also modifiers of the item.
 */
export interface ItemMaterial {
  id: string;
  /** Bonus the material gave (OB, DB, Shield, or the range increment of a launcher) */
  bonus: number;
  durability: number;
  magical: boolean;
}
