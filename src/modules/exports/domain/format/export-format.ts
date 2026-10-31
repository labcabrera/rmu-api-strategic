import type { CharacterCondition } from '../../../characters/domain/value-objects/character-condition.vo.js';
import type { EquipmentSlot } from '../../../characters/domain/value-objects/character-equipment.vo.js';
import type { CharacterRealm } from '../../../characters/domain/value-objects/character-realm.vo.js';
import type { CharacterGender } from '../../../characters/domain/value-objects/character-roleplay-info.vo.js';
import type { StatKey } from '../../../characters/domain/value-objects/character-stat.vo.js';
import type { CharacterStatus } from '../../../characters/domain/value-objects/character-status.vo.js';
import type { TraitPayment } from '../../../characters/domain/value-objects/character-trait.vo.js';
import type { ProfessionalBonusType } from '../../../characters/domain/value-objects/professional-bonus-type.vo.js';
import type { WeaponDevelopmentType } from '../../../characters/domain/value-objects/weapon-development-type.vo.js';
import type { Injury } from '../../../characters/domain/value-objects/injury.vo.js';
import type { ItemArmor } from '../../../items/domain/value-objects/item-armor.vo.js';
import type { ItemCatalogInfo } from '../../../items/domain/value-objects/item-catalog-info.vo.js';
import type { ItemInfo } from '../../../items/domain/value-objects/item-info.vo.js';
import type { ItemModifierSourceKind, ItemModifierTarget, ItemModifierType } from '../../../items/domain/value-objects/item-modifier.vo.js';
import type { ItemShield } from '../../../items/domain/value-objects/item-shield.vo.js';
import type { ItemCoating } from '../../../items/domain/value-objects/item-coating.vo.js';
import type { ItemMaterial } from '../../../items/domain/value-objects/item-material.vo.js';
import type { ItemWeapon } from '../../../items/domain/value-objects/item-weapon.vo.js';

/**
 * The export file of strategic (workspace spec 024, decisions 1-4). It is not the Mongo document: the mappers of
 * `../mappers` translate between both, so an internal change does not change the file by accident. A change in what
 * this file holds raises CURRENT_FORMAT_VERSION and adds an upcaster (decision 2, ADR 0008).
 */
export const EXPORT_FORMAT = 'rmu-strategic-export';
export const CURRENT_FORMAT_VERSION = 8;
export const EXPORT_APP = 'rmu-api-strategic';

/** Limits of a file (decision 11). */
export const MAX_IMPORT_CHARACTERS = 200;
export const MAX_IMPORT_ITEMS = 2000;

export type ExportKind = 'character' | 'faction';
export const EXPORT_KINDS: ExportKind[] = ['character', 'faction'];

/** A local id inside the file: `c1`, `c2`... for characters and `i1`, `i2`... for items. */
export type ExportRef = string;

export interface ExportSource {
  app: string;
  appVersion: string;
  gameId: string;
  gameName: string;
  realmId: string | null;
  realmName: string | null;
  factionId: string;
  factionName: string;
  /** Keycloak id of the owner in the source installation: information only (decision 10). */
  owner: string | null;
}

/** An external id the file uses, with the name the source knew, for the preview and the messages. */
export interface ExportReference {
  id: string;
  name: string | null;
}

export interface ExportReferences {
  races: ExportReference[];
  professions: ExportReference[];
  cultures: ExportReference[];
  skills: ExportReference[];
  traits: ExportReference[];
  itemTypes: ExportReference[];
}

export interface CharacterExportInfo {
  raceId: string;
  raceName: string;
  professionId: string;
  sizeId: string;
  /** Deprecated: the first realm, kept for older readers */
  realmType: CharacterRealm;
  /** Spec 029 (format 2): the realms, two for a hybrid */
  realmTypes: CharacterRealm[];
  height: number;
  weight: number;
  cultureId: string | null;
}

export interface CharacterExportExperience {
  level: number;
  availableLevel: number;
  xp: number;
  devPoints: number;
  availableDevPoints: number;
  availableBonusDevPoints: number;
  availableStatLevelUp: number;
  developedStatLevelUp: number;
  weaponDevelopment: WeaponDevelopmentType[];
  bonusDevPointsSpentThisLevel: number;
  flawDevPoints: number;
}

export interface CharacterExportStat {
  potential: number;
  temporary: number;
}

export interface CharacterExportSkill {
  skillId: string;
  specialization: string | null;
  /** Copied so that a skill missing in the destination catalog keeps its stat bonus (decision 8). */
  statistics: string[];
  development: number[];
  professional: ProfessionalBonusType[] | null;
  ranks: number;
  ranksDeveloped: number;
  cultureRanks: number;
  devPointsSpent: { normal: number; bonus: number };
  knackBonus: number | null;
  /** Fighting style skills (workspace spec 032); missing in files of older versions. */
  styleAbilities?: { abilityId: string; times: number; cost: number }[];
}

/** A trait chosen for the character. The race traits are not exported: they come from the destination race. */
export interface CharacterExportTrait {
  traitId: string;
  traitName: string;
  isTalent: boolean;
  tier: number | null;
  cost: number;
  specialization: string | null;
  paidWith: TraitPayment | null;
}

export interface CharacterExportEndurance {
  base: number;
  customBonus: number;
  max: number;
  current: number;
  accumulator: number;
  fatiguePenalty: number;
}

export interface CharacterExportResistance {
  resistance: string;
  customBonus: number;
}

/** A character without ids, owner, game or derived values (decision 3). */
export interface CharacterExport {
  name: string;
  info: CharacterExportInfo;
  roleplay: { gender: CharacterGender | null; age: number | null };
  experience: CharacterExportExperience;
  statistics: Record<StatKey, CharacterExportStat>;
  skills: CharacterExportSkill[];
  traits: CharacterExportTrait[];
  hp: { current: number };
  endurance: CharacterExportEndurance;
  power: { current: number } | null;
  resistances: CharacterExportResistance[];
  /** Slots point to the `ref` of the items of the same character. */
  equipment: { slots: Partial<Record<EquipmentSlot, ExportRef | null>> };
  status: CharacterStatus;
  injuries: Injury[];
  conditions: CharacterCondition[];
  description: string | null;
  imageUrl: string | null;
}

export interface ItemExportModifierSource {
  kind: ItemModifierSourceKind;
  tacticalGameId?: string;
  tacticalGameName?: string;
  round?: number;
  actionId?: string;
  /** The crafter is a character of the file (decision 4). */
  crafterRef?: ExportRef;
  /** The crafter is not in the file: only its name. */
  crafterName?: string;
}

export interface ItemExportModifier {
  id: string;
  type: ItemModifierType;
  value: number;
  appliesTo: ItemModifierTarget;
  broken?: boolean;
  source?: ItemExportModifierSource;
  description?: string;
  /** Workspace spec 043: circumstance of a conditional modifier. */
  condition?: string;
  createdAt: string;
}

export interface ItemExport {
  ref: ExportRef;
  itemTypeId: string;
  name: string;
  category: string;
  carried: boolean;
  weapon: ItemWeapon | null;
  armor: ItemArmor | null;
  shield: ItemShield | null;
  info: ItemInfo;
  amount: number | null;
  description: string | null;
  catalog: ItemCatalogInfo | null;
  value: number | null;
  acquiredPrice: number | null;
  unrepairable: boolean;
  /** Workspace spec 042: poison on the weapon. */
  coating?: ItemCoating | null;
  /** Workspace spec 043: superior material it was crafted of. */
  material?: ItemMaterial | null;
  modifiers: ItemExportModifier[];
}

/** A character with its items: `data` of a character file and each entry of `data.characters` of a faction file. */
export interface CharacterEntry {
  ref: ExportRef;
  character: CharacterExport;
  items: ItemExport[];
}

/**
 * An NPC of the faction (workspace spec 055, format 8): a reference to an NPC of rmu-api-npcs, not a copy. The import
 * keeps those the destination can use and skips the others with a warning.
 */
export interface FactionNpcExport {
  npcId: string;
  name: string;
  count: number;
  notes: string | null;
}

export interface FactionExport {
  name: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  management: { availableGold: number };
  npcs: FactionNpcExport[];
}

export interface FactionFileData {
  faction: FactionExport;
  armory: ItemExport[];
  characters: CharacterEntry[];
}

interface ExportEnvelopeBase {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  exportedAt: string;
  source: ExportSource;
  references: ExportReferences;
}

export interface CharacterFile extends ExportEnvelopeBase {
  kind: 'character';
  data: CharacterEntry;
}

export interface FactionFile extends ExportEnvelopeBase {
  kind: 'faction';
  data: FactionFileData;
}

export type ExportFile = CharacterFile | FactionFile;
