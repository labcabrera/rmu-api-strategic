/**
 * Kinds of the descriptive properties of an enchanted item (workspace specs 064 and 067): not applied by the rules yet.
 * `ob`, `db` and `shield` are the bonuses against a creature type, which only apply sometimes.
 */
export const ITEM_ENCHANTMENT_PROPERTY_KINDS = [
  'spell-adder',
  'pp-multiplier',
  'skill',
  'pp-adder',
  'rr',
  'stat',
  'armor-penalty',
  'charges',
  'spell',
  'ob',
  'db',
  'shield',
] as const;
export type ItemEnchantmentPropertyKind = (typeof ITEM_ENCHANTMENT_PROPERTY_KINDS)[number];

/** Where the enchantment of an item comes from (workspace spec 067): items stored before it are `alchemy`. */
export const ITEM_ENCHANTMENT_SOURCES = ['alchemy', 'catalog', 'treasure', 'manual'] as const;
export type ItemEnchantmentSource = (typeof ITEM_ENCHANTMENT_SOURCES)[number];

/** Kind of magic item of the catalog (Treasure Law 3.3, workspace spec 067): the same values as rmu-api-items. */
export const MAGIC_ITEM_KINDS = [
  'daily',
  'constant',
  'at-will',
  'triggered',
  'emplaced',
  'charged',
  'single-use',
  'potion',
  'rune-paper',
  'power-enhancer',
  'general-bonus',
  'stat-bonus',
  'skill',
  'armor',
  'weapon',
  'other',
] as const;
export type MagicItemKind = (typeof MAGIC_ITEM_KINDS)[number];

/** How a spell of a magic item is used (workspace spec 067): `recipe` is only a spell of its making. */
export const MAGIC_SPELL_USES = ['recipe', 'constant', 'daily', 'charges', 'at-will', 'triggered', 'emplaced', 'single-use'] as const;
export type MagicSpellUse = (typeof MAGIC_SPELL_USES)[number];

/**
 * A spell embedded in the item. `spellId` is the id of rmu-api-spells (null for a spell of the catalog block, which
 * only has its name, level and list); `use` and `perDay` say how the item casts it (workspace spec 067).
 */
export interface ItemEnchantmentSpell {
  spellId: string | null;
  name: string;
  level: number;
  listCode: string | null;
  use?: MagicSpellUse | null;
  perDay?: number | null;
}

export interface ItemEnchantmentProperty {
  kind: ItemEnchantmentPropertyKind;
  value: number;
  /** The skill of a `skill` property, the stat of a `stat` one, the realm of an `rr` one... */
  target?: string | null;
  /** Workspace spec 067: the creature type the bonus applies against. */
  against?: string | null;
}

/**
 * What an alchemist made of the item (workspace spec 064, decision 6), or the magic of its catalog type, of a
 * treasure or of the game master (workspace spec 067): the level of the item, the spells and the properties the
 * rules do not apply. The OB and DB bonuses are `enchantment` modifiers of the item.
 */
export interface ItemEnchantment {
  /** Workspace spec 067: items stored before it are `alchemy`. */
  source?: ItemEnchantmentSource;
  /** The enchantment project of strategic; null when it did not come from an alchemist. */
  projectId: string | null;
  itemLevel: number;
  /** Workspace spec 067: kind of magic item; null for an alchemist's work. */
  kind?: MagicItemKind | null;
  /** Workspace spec 067: it must be attuned to be used. */
  attunement?: boolean;
  /** The character that made it; null when it came from an export file without that character, or not from one. */
  alchemistId: string | null;
  alchemistName: string | null;
  spells: ItemEnchantmentSpell[];
  properties: ItemEnchantmentProperty[];
  completedAt: string;
}

/** Charges of a charged item (workspace spec 067, decision 8). */
export interface ItemCharges {
  max: number;
  current: number;
}

/** The magic traits of a gem of the catalog (workspace spec 062), kept with a setting. */
export interface ItemGemMagic {
  spells?: string | null;
  stats?: string[];
  skills?: string | null;
  other?: string | null;
}

/** A gem set in an item (workspace spec 067, decision 19): a copy of the gem item, which no longer exists alone. */
export interface ItemGemSetting {
  itemTypeId: string;
  name: string;
  carats: number | null;
  cutFactor: number | null;
  /** Gold of the gem when it was set. */
  value: number;
  magic: ItemGemMagic | null;
  setAt: string;
}

/** The source of an enchantment, `alchemy` for the ones stored before workspace spec 067. */
export const enchantmentSource = (enchantment: ItemEnchantment | null | undefined): ItemEnchantmentSource | null =>
  enchantment ? (enchantment.source ?? 'alchemy') : null;
