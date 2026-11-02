import type { InjuryType } from '../../../characters/domain/value-objects/injury.vo.js';
import type { PoisonData } from '../../../characters/domain/value-objects/poison.vo.js';
import type { MagicItemKind, MagicSpellUse } from './item-enchantment.vo.js';

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
  /** Workspace spec 042: a poison (category, level, form, maximum severity, immediate hits and onset). */
  poison?: Omit<PoisonData, 'name' | 'itemTypeId'> | null;
  /** Workspace spec 042: an antidote (categories, level and the hours after the exposure it still works). */
  antidote?: { categories: string[]; level: number; withinHours: number | null } | null;
  /** Workspace spec 062: the blocks of Treasure Law (herbs, acids, intoxicants, gems, jewelry, animals, property). */
  herb?: ItemHerb | null;
  acid?: Record<string, unknown> | null;
  intoxicant?: Record<string, unknown> | null;
  gem?: ItemGem | null;
  jewelry?: ItemJewelry | null;
  animal?: Record<string, unknown> | null;
  property?: Record<string, unknown> | null;
  /** Workspace spec 067: a magic item of Treasure Law (any category). */
  magic?: MagicItemFeature | null;
}

/** Kinds of bonus of a magic item (workspace spec 067): the same values as rmu-api-items. */
export const MAGIC_BONUS_KINDS = [
  'ob',
  'db',
  'shield',
  'skill',
  'rr',
  'stat',
  'spell-adder',
  'pp-multiplier',
  'pp-adder',
  'armor-penalty',
] as const;
export type MagicBonusKind = (typeof MAGIC_BONUS_KINDS)[number];

export interface MagicItemBonus {
  kind: MagicBonusKind;
  value: number;
  target?: string | null;
  /** Creature type it applies against (a key of table 7-1k); null applies always. */
  against?: string | null;
}

export interface MagicItemSpell {
  name: string;
  level: number;
  /** Code of the spell list in rmu-api-spells. */
  list?: string | null;
  use: MagicSpellUse;
  perDay?: number | null;
}

/** The `features.magic` block of a catalog type (workspace spec 067, decision 4). */
export interface MagicItemFeature {
  itemLevel: number;
  kind: MagicItemKind;
  /** Working days of the recipe. */
  days: number | null;
  /** Gold, power level Superior, base item included. */
  standardPrice: number | null;
  /** Gold, the base item part of standardPrice. */
  basePrice: number | null;
  attunement: boolean;
  /** Maximum charges. */
  charges: number | null;
  realm: string | null;
  bonuses: MagicItemBonus[];
  spells: MagicItemSpell[];
  section: string | null;
}

/** Biome codes of Treasure Law table 2-3b (Core Law 15-1). */
export type Biome = 'A' | 'O' | 'U' | 'I' | 'T' | 'B' | 'X' | 'P' | 'F' | 'D' | 'S' | 'J';
export const BIOMES: Biome[] = ['A', 'O', 'U', 'I', 'T', 'B', 'X', 'P', 'F', 'D', 'S', 'J'];

export type HerbGroup = 'antidote' | 'general' | 'injury' | 'life' | 'minor-healing' | 'alteration' | 'stun';

/** Injury type a herb treats (Core Law 13-1a), or any. */
export type HerbTreats = InjuryType | 'any';

/** What a rule reads of the effect of a herb (workspace spec 062); the rest stays in the description. */
export interface HerbEffects {
  /** Hits restored, as a dice range. */
  heal: { min: number; max: number } | null;
  /** Rounds of stun removed (999: all). */
  stunRelief: number | null;
  treats: HerbTreats[] | null;
  /** Extra bonus to the recovery roll when stated. */
  recoveryBonus: number | null;
}

/** Workspace spec 062: a herb of Treasure Law 2.3. `find` is a difficulty code (`n` is the `ni` of strategic). */
export interface ItemHerb {
  group: HerbGroup;
  biomes: Biome[];
  highAltitude: boolean;
  find: string;
  form: string;
  prep: string;
  season: string | null;
  effectDelay: 'immediate' | 'rounds' | 'minutes';
  /** False for the mundane herbs. */
  magical: boolean;
  addictionFactor: number | null;
  effects: HerbEffects | null;
}

/** Workspace spec 062: a gem variety; the value of an instance is per carat. */
export interface ItemGem {
  grade: 'precious' | 'semi-precious';
  mineral: string;
  /** Gold per carat. */
  valuePerCarat: number;
  hardness?: { min: number; max: number } | null;
  specificGravity?: { min: number; max: number } | null;
  luster?: string | null;
  caratsPerCm?: number | null;
  magic?: { spells: string | null; stats: string[]; skills: string | null; other: string | null } | null;
}

/** Workspace spec 062: a jewelry type, with the base value range before the class factor. */
export interface ItemJewelry {
  value: { min: number; max: number; dice: string | null; openEnded: boolean };
  slot: string | null;
}
