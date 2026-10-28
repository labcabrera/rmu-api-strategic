import { characterRealms } from '../../../characters/domain/value-objects/character-realm.vo.js';
import type { Character } from '../../../characters/domain/aggregates/character.js';
import type { EquipmentSlot } from '../../../characters/domain/value-objects/character-equipment.vo.js';
import { STAT_KEYS, type StatKey } from '../../../characters/domain/value-objects/character-stat.vo.js';
import type { Faction } from '../../../factions/domain/aggregates/faction.js';
import type { Item } from '../../../items/domain/aggregates/item.js';
import type { ItemArmor } from '../../../items/domain/value-objects/item-armor.vo.js';
import type { ItemCatalogInfo } from '../../../items/domain/value-objects/item-catalog-info.vo.js';
import type { ItemInfo } from '../../../items/domain/value-objects/item-info.vo.js';
import type { ItemModifier, ItemModifierSource } from '../../../items/domain/value-objects/item-modifier.vo.js';
import type { ItemWeapon } from '../../../items/domain/value-objects/item-weapon.vo.js';
import type {
  CharacterEntry,
  CharacterExport,
  CharacterExportStat,
  ExportKind,
  ExportRef,
  ExportReference,
  ExportReferences,
  FactionExport,
  ItemExport,
  ItemExportModifier,
  ItemExportModifierSource,
} from '../format/export-format.js';

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];

/** Who crafted or repaired an item, from the source of its modifier (resolved by the caller, from the ledger). */
export type CrafterLookup = (source: ItemModifierSource) => { id: string | null; name: string | null } | undefined;

/** Local ids of the file (decision 3): characters and items by their id in the source. */
export interface ExportRefs {
  characters: Map<string, ExportRef>;
  items: Map<string, ExportRef>;
}

export function assignRefs(characterIds: string[], itemIds: string[]): ExportRefs {
  return {
    characters: new Map(characterIds.map((id, index) => [id, `c${index + 1}`])),
    items: new Map(itemIds.map((id, index) => [id, `i${index + 1}`])),
  };
}

const orNull = <T>(value: T | null | undefined): T | null => (value === undefined ? null : value);

/** A plain copy of stored data (Mongo subdocuments included). */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function weaponToExport(weapon: ItemWeapon): ItemWeapon {
  const result: ItemWeapon = {
    skillId: weapon.skillId,
    fumble: weapon.fumble,
    modes: (weapon.modes || []).map(mode => ({
      type: mode.type,
      attackTypes: [...(mode.attackTypes || [])],
      attackTable: mode.attackTable,
      fumbleTable: mode.fumbleTable,
      sizeAdjustment: mode.sizeAdjustment ?? 0,
      ranges: mode.ranges ? mode.ranges.map(range => ({ from: range.from, to: range.to, bonus: range.bonus })) : null,
      ...(mode.obModifier ? { obModifier: mode.obModifier } : {}),
    })),
  };
  return {
    ...result,
    ...(weapon.wielderSize ? { wielderSize: weapon.wielderSize } : {}),
    ...(weapon.tags?.length ? { tags: [...weapon.tags] } : {}),
  };
}

const armorToExport = (armor: ItemArmor): ItemArmor => ({
  slot: armor.slot,
  at: armor.at,
  enc: armor.enc,
  maneuverPenalty: armor.maneuverPenalty,
  rangedPenalty: armor.rangedPenalty,
  perceptionPenalty: armor.perceptionPenalty,
  baseDifficulty: armor.baseDifficulty,
  ...(armor.coverage?.length ? { coverage: [...armor.coverage] } : {}),
  ...(armor.class ? { class: armor.class } : {}),
});

const infoToExport = (info: ItemInfo): ItemInfo => ({
  length: orNull(info?.length),
  weight: info?.weight ?? 0,
  strength: orNull(info?.strength),
  stackable: !!info?.stackable,
});

function catalogToExport(catalog: ItemCatalogInfo): ItemCatalogInfo {
  const cost = catalog.cost
    ? { min: orNull(catalog.cost.min), average: orNull(catalog.cost.average), max: orNull(catalog.cost.max) }
    : null;
  return {
    cost,
    rarity: orNull(catalog.rarity),
    productionHours: orNull(catalog.productionHours),
    imageUrl: orNull(catalog.imageUrl),
    ...(catalog.lotSize ? { lotSize: catalog.lotSize } : {}),
    ...(catalog.features ? { features: plain(catalog.features) } : {}),
  };
}

/** The own data and the temporary state of a character (decision 3): no ids, owner, game or derived values. */
export function characterToExport(character: Character, refs: ExportRefs): CharacterExport {
  const statistics = Object.fromEntries(
    STAT_KEYS.map(key => {
      const stat = character.statistics[key];
      return [key, { potential: stat?.potential ?? 0, temporary: stat?.temporary ?? 0 }];
    }),
  ) as Record<StatKey, CharacterExportStat>;
  // Only the known slots: a stored document also carries the internal fields of Mongoose
  const stored = (character.equipment?.slots || {}) as Partial<Record<EquipmentSlot, string | null>>;
  const slots: Partial<Record<EquipmentSlot, ExportRef | null>> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = stored[slot];
    if (itemId !== undefined) slots[slot] = itemId ? (refs.items.get(itemId) ?? null) : null;
  }
  const xp = character.experience;
  const endurance = character.endurance;
  return {
    name: character.name,
    info: {
      raceId: character.info.race.id,
      raceName: character.info.race.name,
      professionId: character.info.professionId,
      sizeId: character.info.sizeId,
      realmType: characterRealms(character.info)[0],
      realmTypes: characterRealms(character.info),
      height: character.info.height,
      weight: character.info.weight,
      cultureId: orNull(character.info.cultureId),
    },
    roleplay: { gender: orNull(character.roleplay?.gender), age: orNull(character.roleplay?.age) },
    experience: {
      level: xp.level,
      availableLevel: xp.availableLevel,
      xp: xp.xp,
      devPoints: xp.devPoints,
      availableDevPoints: xp.availableDevPoints,
      availableBonusDevPoints: xp.availableBonusDevPoints ?? 0,
      availableStatLevelUp: xp.availableStatLevelUp ?? 0,
      developedStatLevelUp: xp.developedStatLevelUp ?? 0,
      weaponDevelopment: [...xp.weaponDevelopment],
      bonusDevPointsSpentThisLevel: xp.bonusDevPointsSpentThisLevel ?? 0,
      flawDevPoints: xp.flawDevPoints ?? 0,
    },
    statistics,
    skills: character.skills.map(skill => ({
      skillId: skill.skillId,
      specialization: orNull(skill.specialization),
      statistics: [...(skill.statistics || [])],
      development: [...(skill.development || [])],
      professional: skill.professional ? [...skill.professional] : null,
      ranks: skill.ranks,
      ranksDeveloped: skill.ranksDeveloped,
      cultureRanks: skill.cultureRanks ?? 0,
      devPointsSpent: { normal: skill.devPointsSpent?.normal ?? 0, bonus: skill.devPointsSpent?.bonus ?? 0 },
      knackBonus: orNull(skill.knackBonus),
      ...(skill.styleAbilities?.length ? { styleAbilities: skill.styleAbilities.map(a => ({ ...a })) } : {}),
    })),
    traits: character.traits
      .filter(trait => trait.source !== 'race')
      .map(trait => ({
        traitId: trait.traitId,
        traitName: trait.traitName,
        isTalent: trait.isTalent,
        tier: orNull(trait.tier),
        cost: trait.cost ?? 0,
        specialization: orNull(trait.specialization),
        paidWith: trait.paidWith ? { ...trait.paidWith } : null,
      })),
    hp: { current: character.hp.current },
    endurance: {
      base: endurance?.base ?? 0,
      customBonus: endurance?.customBonus ?? 0,
      max: endurance?.max ?? 0,
      current: endurance?.current ?? 0,
      accumulator: endurance?.accumulator ?? 0,
      fatiguePenalty: endurance?.fatiguePenalty ?? 0,
    },
    power: character.power ? { current: character.power.current } : null,
    resistances: (character.resistances || [])
      .filter(resistance => (resistance.customBonus || 0) !== 0)
      .map(resistance => ({ resistance: resistance.resistance, customBonus: resistance.customBonus })),
    equipment: { slots },
    status: character.status,
    injuries: plain(character.injuries || []),
    conditions: plain(character.conditions || []),
    description: orNull(character.description),
    imageUrl: orNull(character.imageUrl),
  };
}

function modifierSourceToExport(source: ItemModifierSource, refs: ExportRefs, crafterOf: CrafterLookup): ItemExportModifierSource {
  const result: ItemExportModifierSource = { kind: source.kind };
  if (source.tacticalGameId) result.tacticalGameId = source.tacticalGameId;
  if (source.tacticalGameName) result.tacticalGameName = source.tacticalGameName;
  if (source.round !== undefined && source.round !== null) result.round = source.round;
  if (source.actionId) result.actionId = source.actionId;
  if (source.kind === 'crafting' || source.kind === 'repair') {
    const crafter = crafterOf(source);
    const crafterRef = crafter?.id ? refs.characters.get(crafter.id) : undefined;
    if (crafterRef) result.crafterRef = crafterRef;
    else if (crafter?.name) result.crafterName = crafter.name;
  }
  return result;
}

function modifierToExport(modifier: ItemModifier, refs: ExportRefs, crafterOf: CrafterLookup): ItemExportModifier {
  const result: ItemExportModifier = {
    id: modifier.id,
    type: modifier.type,
    value: modifier.value,
    appliesTo: modifier.appliesTo,
    createdAt: modifier.createdAt,
  };
  if (modifier.broken) result.broken = true;
  if (modifier.source) result.source = modifierSourceToExport(modifier.source, refs, crafterOf);
  if (modifier.description) result.description = modifier.description;
  if (modifier.condition) result.condition = modifier.condition;
  return result;
}

/** An item of the file. Items stored before specs 019 and 023 get the fields they lack. */
export function itemToExport(item: Item, refs: ExportRefs, crafterOf: CrafterLookup): ItemExport {
  return {
    ref: refs.items.get(item.id)!,
    itemTypeId: item.itemTypeId,
    name: item.name,
    category: item.category,
    carried: !!item.carried,
    weapon: item.weapon ? weaponToExport(item.weapon) : null,
    armor: item.armor ? armorToExport(item.armor) : null,
    shield: item.shield ? { db: item.shield.db, blockCount: item.shield.blockCount } : null,
    info: infoToExport(item.info),
    amount: orNull(item.amount),
    description: orNull(item.description),
    catalog: item.catalog ? catalogToExport(item.catalog) : null,
    value: orNull(item.value),
    acquiredPrice: orNull(item.acquiredPrice),
    unrepairable: !!item.unrepairable,
    ...(item.coating ? { coating: plain(item.coating) } : {}),
    ...(item.material ? { material: plain(item.material) } : {}),
    // Temporary modifiers live only in tactical games
    modifiers: (item.modifiers || []).filter(modifier => !modifier.temporary).map(modifier => modifierToExport(modifier, refs, crafterOf)),
  };
}

export function characterEntry(character: Character, items: Item[], refs: ExportRefs, crafterOf: CrafterLookup): CharacterEntry {
  return {
    ref: refs.characters.get(character.id)!,
    character: characterToExport(character, refs),
    items: items.map(item => itemToExport(item, refs, crafterOf)),
  };
}

export function factionToExport(faction: Faction): FactionExport {
  return {
    name: faction.name,
    shortDescription: orNull(faction.shortDescription),
    description: orNull(faction.description),
    imageUrl: orNull(faction.imageUrl),
    management: { availableXP: faction.management?.availableXP ?? 0, availableGold: faction.management?.availableGold ?? 0 },
  };
}

/** The external ids the file uses, with the names the source knew (decision 1), sorted by id. */
export function collectReferences(entries: CharacterEntry[], armory: ItemExport[] = []): ExportReferences {
  const sets = {
    races: new Map<string, string | null>(),
    professions: new Map<string, string | null>(),
    cultures: new Map<string, string | null>(),
    skills: new Map<string, string | null>(),
    traits: new Map<string, string | null>(),
    itemTypes: new Map<string, string | null>(),
  };
  const add = (map: Map<string, string | null>, id: string | null | undefined, name: string | null = null) => {
    if (id && (!map.has(id) || (map.get(id) === null && name))) map.set(id, name);
  };
  for (const { character, items } of entries) {
    add(sets.races, character.info.raceId, character.info.raceName);
    add(sets.professions, character.info.professionId);
    add(sets.cultures, character.info.cultureId);
    character.skills.forEach(skill => add(sets.skills, skill.skillId));
    character.traits.forEach(trait => add(sets.traits, trait.traitId, trait.traitName));
    items.forEach(item => add(sets.itemTypes, item.itemTypeId, item.name));
  }
  armory.forEach(item => add(sets.itemTypes, item.itemTypeId, item.name));
  const list = (map: Map<string, string | null>): ExportReference[] =>
    [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id));
  return {
    races: list(sets.races),
    professions: list(sets.professions),
    cultures: list(sets.cultures),
    skills: list(sets.skills),
    traits: list(sets.traits),
    itemTypes: list(sets.itemTypes),
  };
}

/** `character-<slug>-<yyyymmdd>.rmu.json` (decision 1). */
export function exportFileName(kind: ExportKind, name: string, date: Date): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || kind;
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${kind}-${slug}-${day}.rmu.json`;
}
