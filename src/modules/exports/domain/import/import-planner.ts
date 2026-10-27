import { randomUUID } from 'crypto';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { CharacterDefense } from '../../../characters/domain/value-objects/character-defense.vo.js';
import { CharacterEndurance } from '../../../characters/domain/value-objects/character-endurance.vo.js';
import { CharacterEquipment, type EquipmentSlot } from '../../../characters/domain/value-objects/character-equipment.vo.js';
import { CharacterHP } from '../../../characters/domain/value-objects/character-hp.vo.js';
import { CharacterInitiative } from '../../../characters/domain/value-objects/character-initiative.vo.js';
import { CharacterMovement } from '../../../characters/domain/value-objects/character-movement.vo.js';
import { CharacterResistance } from '../../../characters/domain/value-objects/character-resistances.vo.js';
import { CharacterSkill } from '../../../characters/domain/value-objects/character-skill.vo.js';
import { CharacterStat, STAT_KEYS, type StatKey } from '../../../characters/domain/value-objects/character-stat.vo.js';
import { CharacterTrait } from '../../../characters/domain/value-objects/character-trait.vo.js';
import { CharacterXP } from '../../../characters/domain/value-objects/character-xp.vo.js';
import { Item } from '../../../items/domain/aggregates/item.js';
import { ItemCreatedEvent } from '../../../items/domain/events/item.events.js';
import type { ItemModifier, ItemModifierSource } from '../../../items/domain/value-objects/item-modifier.vo.js';
import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import type { CharacterEntry, CharacterExport, ExportRef, ItemExport, ItemExportModifier } from '../format/export-format.js';

/** Where the imported entities go and what the destination catalog lacks (workspace spec 024, decisions 5, 8 and 10). */
export interface ImportTarget {
  gameId: string;
  faction: NamedEntity;
  /** Whoever imports owns everything created (decision 10). */
  owner: string;
  importId: string;
  missingSkills: Set<string>;
  missingTraits: Set<string>;
  /** Names of the characters of the file, for crafters that are not imported (a character taken from a faction file). */
  characterNames: Map<ExportRef, string>;
}

export interface PlannedCharacter {
  entry: CharacterEntry;
  character: Character;
  items: Item[];
}

export interface ImportPlan {
  characters: PlannedCharacter[];
  armory: Item[];
}

/**
 * Builds the aggregates of an import with new ids (decision 5): local `ref`s become the new ids in the slots, the
 * holders and the crafters. Derived values are left empty: the caller applies the destination race and runs the
 * character processor (decision 7).
 */
export function planImport(entries: CharacterEntry[], armory: ItemExport[], target: ImportTarget): ImportPlan {
  const characterIds = new Map(entries.map(entry => [entry.ref, randomUUID()]));
  const itemIds = new Map([...entries.flatMap(entry => entry.items), ...armory].map(item => [item.ref, randomUUID()]));

  const toItem = (item: ItemExport, holder: { characterId: string | null; factionId: string | null }) =>
    buildItem(item, itemIds.get(item.ref)!, holder, characterIds, target);

  const characters = entries.map(entry => {
    const id = characterIds.get(entry.ref)!;
    const character = buildCharacter(entry.character, id, itemIds, target);
    const items = entry.items.map(item => toItem(item, { characterId: id, factionId: null }));
    return { entry, character, items };
  });
  return { characters, armory: armory.map(item => toItem(item, { characterId: null, factionId: target.faction.id })) };
}

function buildCharacter(data: CharacterExport, id: string, itemIds: Map<ExportRef, string>, target: ImportTarget): Character {
  const statistics = Object.fromEntries(
    STAT_KEYS.map(key => [key, CharacterStat.fromModifiers(data.statistics[key].potential, data.statistics[key].temporary, {} as never)]),
  ) as Record<StatKey, CharacterStat>;
  const slots = {} as Record<EquipmentSlot, string | null>;
  for (const [slot, ref] of Object.entries(data.equipment.slots)) {
    slots[slot as EquipmentSlot] = ref ? (itemIds.get(ref) ?? null) : null;
  }
  const xp = data.experience;
  const endurance = data.endurance;
  const character = Character.fromProps({
    id,
    gameId: target.gameId,
    faction: target.faction,
    name: data.name,
    info: {
      race: new NamedEntity(data.info.raceId, data.info.raceName),
      professionId: data.info.professionId,
      sizeId: data.info.sizeId,
      realmType: data.info.realmTypes[0],
      realmTypes: data.info.realmTypes,
      height: data.info.height,
      weight: data.info.weight,
      cultureId: data.info.cultureId,
    },
    roleplay: { gender: data.roleplay.gender ?? undefined, age: data.roleplay.age ?? undefined },
    experience: new CharacterXP(
      xp.level,
      xp.availableLevel,
      xp.xp,
      xp.devPoints,
      xp.availableDevPoints,
      xp.availableBonusDevPoints,
      xp.availableStatLevelUp,
      xp.developedStatLevelUp,
      [...xp.weaponDevelopment],
      xp.bonusDevPointsSpentThisLevel,
      xp.flawDevPoints,
    ),
    statistics,
    movement: CharacterMovement.empty(),
    defense: CharacterDefense.empty(),
    resistances: data.resistances.map(r => new CharacterResistance(r.resistance, 0, 0, 0, r.customBonus)),
    // Empty: the processor sets the maximum, then the caller restores the current hits (decision 7)
    hp: CharacterHP.empty(),
    endurance: new CharacterEndurance(
      endurance.base,
      0,
      endurance.customBonus,
      endurance.max,
      endurance.current,
      endurance.accumulator,
      endurance.fatiguePenalty,
    ),
    power: null,
    initiative: new CharacterInitiative({}),
    skills: data.skills.map(
      skill =>
        new CharacterSkill(
          skill.skillId,
          skill.specialization,
          [...skill.statistics],
          [...skill.development],
          skill.professional ? [...skill.professional] : null,
          skill.ranks,
          skill.ranksDeveloped,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          skill.cultureRanks,
          { ...skill.devPointsSpent },
          skill.knackBonus ?? undefined,
          target.missingSkills.has(skill.skillId) || undefined,
          skill.styleAbilities?.map(a => ({ ...a })),
        ),
    ),
    equipment: new CharacterEquipment(slots, 0, 0, 0, 0, 0, 0, 0, 0, 'e'),
    attacks: [],
    traits: data.traits.map(
      trait =>
        new CharacterTrait(
          trait.traitId,
          trait.traitName,
          trait.isTalent,
          trait.tier ?? undefined,
          trait.cost,
          trait.specialization ?? undefined,
          'character',
          trait.paidWith ?? undefined,
          target.missingTraits.has(trait.traitId) || undefined,
        ),
    ),
    status: data.status,
    injuries: structuredClone(data.injuries),
    conditions: structuredClone(data.conditions),
    appliedTacticalGames: [],
    description: data.description ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    owner: target.owner,
    createdAt: new Date(),
    updatedAt: undefined,
    importId: target.importId,
  });
  return character;
}

function modifierSource(
  modifier: ItemExportModifier,
  characterIds: Map<ExportRef, string>,
  target: ImportTarget,
): ItemModifierSource | undefined {
  const source = modifier.source;
  if (!source) return undefined;
  const { crafterRef, crafterName, ...rest } = source;
  const result: ItemModifierSource = { ...rest };
  const crafterId = crafterRef ? characterIds.get(crafterRef) : undefined;
  if (crafterId) result.crafterId = crafterId;
  // A crafter outside the import keeps only its name (decisions 4 and 13)
  const name = crafterName ?? (crafterRef ? target.characterNames.get(crafterRef) : undefined);
  if (name) result.crafterName = name;
  return result;
}

function buildItem(
  data: ItemExport,
  id: string,
  holder: { characterId: string | null; factionId: string | null },
  characterIds: Map<ExportRef, string>,
  target: ImportTarget,
): Item {
  const modifiers: ItemModifier[] = data.modifiers.map(modifier => {
    const source = modifierSource(modifier, characterIds, target);
    return {
      id: modifier.id,
      type: modifier.type,
      value: modifier.value,
      appliesTo: modifier.appliesTo,
      ...(modifier.broken ? { broken: true } : {}),
      ...(source ? { source } : {}),
      ...(modifier.description ? { description: modifier.description } : {}),
      createdAt: modifier.createdAt,
    };
  });
  const item = Item.fromProps({
    id,
    gameId: target.gameId,
    ...holder,
    itemTypeId: data.itemTypeId,
    name: data.name,
    category: data.category,
    carried: data.carried,
    weapon: data.weapon,
    armor: data.armor,
    shield: data.shield,
    modifiers,
    amount: data.amount,
    info: data.info,
    description: data.description,
    catalog: data.catalog,
    value: data.value,
    acquiredPrice: data.acquiredPrice,
    unrepairable: data.unrepairable,
    coating: data.coating ?? null,
    accessType: 'public',
    owner: target.owner,
    createdAt: new Date(),
    updatedAt: null,
    importId: target.importId,
  });
  item.apply(new ItemCreatedEvent(item.getProps()));
  return item;
}
