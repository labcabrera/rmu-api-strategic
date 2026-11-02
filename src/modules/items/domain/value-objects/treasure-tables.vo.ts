import type { MagicItemBonus } from './item-catalog-info.vo.js';
import type { MagicItemKind, MagicSpellUse } from './item-enchantment.vo.js';

/**
 * The treasure tables of rmu-api-core (`GET v1/treasure-tables`, workspace spec 067, plan section 2): the random
 * treasure of Treasure Law 7.1, the random gems of 2.4 and the standard prices of chapter 6. Prices are in silver.
 * The rows are data of the book: they live in Mongo, never in this repository.
 */

/** A row of a table, by a roll from `min` to `max` (inclusive). */
export interface RangeRow {
  min: number;
  max: number;
}

export const TREASURE_QUALITIES = ['very-poor', 'poor', 'normal', 'rich', 'very-rich'] as const;
export type TreasureQuality = (typeof TREASURE_QUALITIES)[number];

export const MAGIC_TABLES = ['melee', 'ranged', 'armor', 'utility', 'spell', 'charged'] as const;
export type MagicTable = (typeof MAGIC_TABLES)[number];

export type WealthType = 'coins' | 'gems' | 'jewelry' | 'art';

export interface GenericMagicItem {
  base: 'weapon' | 'missile' | 'ranged' | 'armor' | 'shield' | 'jewelry' | 'potion' | 'spell-item' | 'other';
  /** A fixed base type (a wand...); otherwise it is rolled. */
  baseItemTypeId?: string | null;
  kind: MagicItemKind;
  itemLevel?: number | null;
  /** `against: 'random'` is rolled on 7-1k. */
  bonuses: MagicItemBonus[];
  spell?: { levelMin: number; levelMax: number; use: MagicSpellUse; perDay?: number | null; charges?: number | null } | null;
}

export interface MagicTableRow extends RangeRow {
  /** Text of the book row (data only). */
  label: string;
  /** Silver. */
  price: { min: number; max: number };
  /** A named item of the compendium. */
  itemTypeId?: string | null;
  generic?: GenericMagicItem | null;
}

export interface GemRandomTable {
  /** Columns by the value of the gem in silver; rows by d100 to a gem type of the catalog. */
  columns: { min: number; max: number; rows: (RangeRow & { itemTypeId: string })[] }[];
}

export interface StandardBonusRow {
  bonus: number;
  days: number;
  level: number;
  /** Silver. */
  price: number;
}

export interface StandardPriceRow {
  days: number;
  level: number;
  price: number;
}

export interface StandardPricing {
  /** 6-1a: price per day = item level + extraSp, by the PP per day. */
  pricePerDay: { ppMin: number; ppMax: number | null; extraSp: number }[];
  weapon: StandardBonusRow[];
  ranged: StandardBonusRow[];
  armor: { at: number; rows: StandardBonusRow[] }[];
  shield: StandardBonusRow[];
  generalBonus: { material: 'wood' | 'metal' | 'leather'; rows: StandardBonusRow[] }[];
  powerEnhancers: { effect: string; held: StandardPriceRow; worn: StandardPriceRow }[];
  daily: { spellLevel: number; realm: 'essence' | 'channeling-mentalism' | 'hybrid'; row: StandardPriceRow }[];
  constant: { spellLevel: number; realm: 'essence' | 'channeling-mentalism' | 'hybrid'; row: StandardPriceRow }[];
  emplaced: { spellLevel: number; row: StandardPriceRow & { itemPp: number } }[];
  potions: { spellLevel: number; row: StandardPriceRow }[];
  charged: { stick: 'wand' | 'rod' | 'staff' | 'half-bole' | 'bole'; spellLevel: number; charges: number; row: StandardPriceRow }[];
}

export interface TreasureTables {
  codes: { wealth: Record<string, TreasureQuality>; lifestyle: Record<string, TreasureQuality>; magic: Record<string, TreasureQuality> };
  wealthRolls: (RangeRow & { rolls: number })[];
  wealthValue: (RangeRow & { valueMin: number; valueMax: number })[];
  wealthValueModifiers: { key: string; value: number }[];
  wealthType: (RangeRow & { type: WealthType; multiplier: number })[];
  wealthMultipliers: Record<TreasureQuality, number>;
  jewelryTypes: (RangeRow & { itemTypeId: string })[];
  artTypes: (RangeRow & { key: string })[];
  gearQuality: (RangeRow & Record<TreasureQuality, { total: number; max: number | null }>)[];
  magicTreasure: (RangeRow & Record<TreasureQuality, number[]>)[];
  magicMaxLevel: Record<TreasureQuality, number | null>;
  itemType: (RangeRow & { table: MagicTable })[];
  magicTables: Record<MagicTable, MagicTableRow[]>;
  randomWeapons: {
    table: (RangeRow & { group: string })[];
    size: (RangeRow & { size: string })[];
    groups: Record<string, (RangeRow & { itemTypeId: string | null; missile?: boolean })[]>;
  };
  creatureTypes: (RangeRow & { key: string })[];
  randomArmor: (RangeRow & { itemTypeId: string | null; at: number | null; shield?: boolean })[];
  randomSpells: { realm: (RangeRow & { realm: string })[]; lists: Record<string, (RangeRow & { listCode: string | null })[]> };
  gems: { precious: GemRandomTable; semiPrecious: GemRandomTable };
  standardPricing: StandardPricing;
}

/** The row a roll falls in, or undefined. */
export function findRow<T extends RangeRow>(rows: T[] | undefined, roll: number): T | undefined {
  return (rows ?? []).find(row => roll >= row.min && roll <= row.max);
}
