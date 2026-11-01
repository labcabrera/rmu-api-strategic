/** Kinds of the descriptive properties of an enchanted item (workspace spec 064): not applied by the rules yet. */
export type ItemEnchantmentPropertyKind = 'spell-adder' | 'pp-multiplier' | 'skill';
export const ITEM_ENCHANTMENT_PROPERTY_KINDS: ItemEnchantmentPropertyKind[] = ['spell-adder', 'pp-multiplier', 'skill'];

/** A spell embedded in the item. `spellId` is the id of rmu-api-spells. */
export interface ItemEnchantmentSpell {
  spellId: string;
  name: string;
  level: number;
  listCode: string;
}

export interface ItemEnchantmentProperty {
  kind: ItemEnchantmentPropertyKind;
  value: number;
  /** The skill of a `skill` property. */
  target?: string | null;
}

/**
 * What an alchemist made of the item (workspace spec 064, decision 6): the level of the item (the highest spell, which
 * is also added to its breakage checks), the spells and the properties the rules do not apply. The OB and DB bonuses
 * are `enchantment` modifiers of the item.
 */
export interface ItemEnchantment {
  /** The enchantment project of strategic. */
  projectId: string;
  itemLevel: number;
  /** The character that made it; null when it came from an export file without that character. */
  alchemistId: string | null;
  alchemistName: string;
  spells: ItemEnchantmentSpell[];
  properties: ItemEnchantmentProperty[];
  completedAt: string;
}
