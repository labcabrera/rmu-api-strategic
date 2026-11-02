/** The 10 alchemy failure tables (workspace spec 064): the same values as `ALCHEMY_FAILURE_TABLES` of rmu-api-core. */
export const ALCHEMY_FAILURE_TABLES = [
  'bonus',
  'embedded-entity',
  'general',
  'independent-entity',
  'intelligence',
  'location',
  'organism',
  'potion',
  'power-enhancer',
  'spell-power',
] as const;
export type AlchemyFailureTable = (typeof ALCHEMY_FAILURE_TABLES)[number];

/** Power level of the campaign (workspace spec 064): it multiplies the enchantment costs, not the base item. */
export const POWER_LEVELS = ['average', 'superior', 'heroic', 'legendary', 'epic'] as const;
export type PowerLevel = (typeof POWER_LEVELS)[number];
export const DEFAULT_POWER_LEVEL: PowerLevel = 'superior';

/** What an alchemical spell adds to the item it is embedded in (a spell of rmu-api-spells). */
export const SPELL_ALCHEMY_EFFECT_KINDS = ['attack', 'defense', 'skill', 'spell-adder', 'pp-multiplier'] as const;
export type SpellAlchemyEffectKind = (typeof SPELL_ALCHEMY_EFFECT_KINDS)[number];

export interface SpellAlchemyEffect {
  kind: SpellAlchemyEffectKind;
  value: number;
}

/** Alchemy metadata of a spell of rmu-api-spells (workspace spec 064, decision 4). */
export interface SpellAlchemy {
  failureTable: AlchemyFailureTable;
  /** In a batch it is cast once per unit. */
  perItem: boolean;
  /** It creates or alters the base item. */
  alters: boolean;
  effect: SpellAlchemyEffect | null;
}

/** A row of a failure table; `max` null is open ("301+"). */
export interface AlchemyFailureRow {
  min: number;
  max: number | null;
  text: string;
  serendipity?: 'minor' | 'major';
}

/** The alchemy tables of rmu-api-core (`GET v1/alchemy-tables`). */
export interface AlchemyTables {
  failureTables: Partial<Record<AlchemyFailureTable, AlchemyFailureRow[]>>;
  powerLevels: Partial<Record<PowerLevel, number>>;
}

/**
 * The row of a failure table a result falls in: the last row that starts at or below it (so a result above a closed
 * last row is that row), or the first row for a result below every row.
 */
export function findFailureRow(rows: AlchemyFailureRow[] | undefined, result: number): AlchemyFailureRow | null {
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.min - b.min);
  const below = sorted.filter(row => row.min <= result);
  return below.length > 0 ? below[below.length - 1] : sorted[0];
}
