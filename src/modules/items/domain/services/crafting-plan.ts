import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemModifierTarget } from '../value-objects/item-modifier.vo.js';
import { roundGold } from './price-calculator.js';

/**
 * What a crafted item is for the quality rules (workspace spec 043, decision 4): where its bonuses go and which
 * materials it can be made of.
 */
export type CraftKind = 'weapon' | 'ammunition' | 'launcher' | 'torso-armor' | 'armor' | 'shield' | 'other';

/** Weapon skills of the launchers: their bonus goes to the range increment (Treasure Law, item bonuses). */
export const LAUNCHER_SKILLS = ['ranged-weapon@bow', 'ranged-weapon@crossbow', 'ranged-weapon@sling'];

/** Kind of item a material is used for, from the catalog of rmu-api-core. */
const MATERIAL_USE: Record<CraftKind, string | null> = {
  weapon: 'weapon',
  ammunition: 'ammunition',
  launcher: 'launcher',
  'torso-armor': 'armor',
  armor: 'armor',
  shield: 'shield',
  other: null,
};

/** Use of the item its bonuses apply to; null when they do not apply to the sheet (launchers, armor pieces). */
const BONUS_TARGET: Record<CraftKind, Exclude<ItemModifierTarget, 'all' | 'breakage'> | null> = {
  weapon: 'attack',
  ammunition: 'attack',
  launcher: null,
  'torso-armor': 'defense',
  armor: null,
  shield: 'defense',
  other: 'maneuver',
};

/** Circumstance of the bonuses of a launcher: they lengthen its range increment. */
export const RANGE_INCREMENT_CONDITION = 'range-increment';

/** Missiles: the material cost is for 20 of them. */
export const MISSILES_PER_MATERIAL_COST = 20;

/** Quality of the workshop and its crafting modifier (Treasure Law, workshop facilities). */
export const WORKSHOP_QUALITIES = ['inferior', 'basic', 'superior-5', 'superior-10', 'superior-15', 'superior-20'] as const;
export type WorkshopQuality = (typeof WORKSHOP_QUALITIES)[number];
const WORKSHOP_MODIFIERS: Record<WorkshopQuality, number> = {
  inferior: -20,
  basic: 0,
  'superior-5': 5,
  'superior-10': 10,
  'superior-15': 15,
  'superior-20': 20,
};

/** Superior craftsmanship: a bonus that always applies, or only in a circumstance (Treasure Law 3.1). */
export const MASTERWORK_KINDS = ['general', 'circumstantial'] as const;
export type MasterworkKind = (typeof MASTERWORK_KINDS)[number];
export const MASTERWORK_BONUS = 5;
const MASTERWORK_MODIFIERS: Record<MasterworkKind, number> = { general: -50, circumstantial: -25 };

/**
 * Armor weight adjustment (Treasure Law 3.1, varying weight): lighter by steps of 5% down to 75%, each 5% one point
 * of DB lost, of crafting and of extra cost; heavier by steps of 10% up to 150%, each 10% five points of DB gained, as
 * many of crafting lost, and twice the DB in percent of cost.
 */
export const ARMOR_WEIGHT_PERCENTS = [-25, -20, -15, -10, -5, 10, 20, 30, 40, 50];
export const armorWeightEffects = (percent: number): { db: number; modifier: number; costPercent: number } => {
  if (percent < 0) return { db: percent, modifier: percent, costPercent: -percent };
  const db = percent / 2;
  return { db, modifier: -db, costPercent: db * 2 };
};

/** The quality the craftsman aims at (workspace spec 043, decision 2). */
export interface CraftingQuality {
  materialId?: string | null;
  /** A blunt weapon: some metals give it another bonus */
  blunt?: boolean;
  /** Wood or stone in place of the metal the item is normally made of */
  replacesMetal?: boolean;
  masterwork?: MasterworkKind | null;
  /** The circumstance of a circumstantial masterwork */
  circumstance?: string | null;
  /** Armor weight change in percent, from ARMOR_WEIGHT_PERCENTS */
  weightPercent?: number | null;
  workshop?: WorkshopQuality | null;
}

/** The material values the plan needs (a material of rmu-api-core). */
export interface PlanMaterial {
  id: string;
  durability: number;
  workability: number | null;
  bonus: number;
  bluntBonus: number | null;
  metalBonus: number | null;
  cost: { add: number | null; multiplier: number | null };
  magical: boolean;
  armorWeightMultiplier: number | null;
  uses: string[];
}

/** The catalog values the plan needs (an item type of rmu-api-items). */
export interface PlanItemType {
  category: string;
  weapon: { skillId: string } | null;
  armor: { slot: string } | null;
  shield: unknown;
  info: { cost: { average: number | null } | null; productionHours?: number | null };
}

export interface CraftingPlanCost {
  /** Price of one unit before the material addition: the average cost, times the material multiplier and the weight cost */
  unitBase: number;
  /** Gold the material adds to one unit */
  unitMaterial: number;
  /** Price (value) of one crafted unit */
  unitPrice: number;
  /** Materials the craftsman pays for every unit: the asked cost, or the house percent of the base plus the material */
  materials: number;
  enhancements: number;
  total: number;
  /** The materials cost was typed by the game master */
  asked: boolean;
}

/** How an item will be crafted (workspace spec 043, decision 3): the same plan quotes and crafts. */
export interface CraftingPlan {
  kind: CraftKind;
  amount: number;
  material: {
    id: string;
    /** Bonus it gives this item (blunt, or in place of metal) */
    bonus: number;
    durability: number;
    workability: number | null;
    magical: boolean;
  } | null;
  /** Use of the item the material and masterwork bonuses apply to; null: the range increment, or none */
  bonusTarget: Exclude<ItemModifierTarget, 'all' | 'breakage'> | null;
  masterwork: MasterworkKind | null;
  circumstance: string | null;
  weightPercent: number | null;
  /** DB the weight adjustment gives */
  weightDb: number;
  /** Factor of the weight of the item (material and weight adjustment) */
  weightMultiplier: number;
  workshop: WorkshopQuality;
  /** Modifiers of the crafting maneuver, with the keys of the ledger */
  modifiers: { key: string; value: number }[];
  /** Production hours of all the units, changed by the workability; null when the catalog has none */
  productionHours: number | null;
  cost: CraftingPlanCost;
}

export interface CraftingPlanInput {
  itemType: PlanItemType;
  amount: number;
  quality: CraftingQuality;
  material: PlanMaterial | null;
  /** House rule: percent of the base price the materials cost */
  materialsPercent: number;
  /** Materials of all the units typed by the game master */
  materialsCost?: number;
  enhancementsCost?: number;
}

const invalid = (message: string, code: string) => new ValidationError(message, code);

export const CraftingPlanner = {
  kind(itemType: Pick<PlanItemType, 'category' | 'weapon' | 'armor' | 'shield'>): CraftKind {
    if (itemType.category === 'ammunition') return 'ammunition';
    if (itemType.weapon) return LAUNCHER_SKILLS.includes(itemType.weapon.skillId) ? 'launcher' : 'weapon';
    if (itemType.shield) return 'shield';
    if (itemType.armor) return itemType.armor.slot === 'body' ? 'torso-armor' : 'armor';
    return 'other';
  },

  /** Materials this kind of item can be made of. */
  allows(kind: CraftKind, material: Pick<PlanMaterial, 'uses'>): boolean {
    const use = MATERIAL_USE[kind];
    return use !== null && material.uses.includes(use);
  },

  plan(input: CraftingPlanInput): CraftingPlan {
    const { itemType, amount, quality, material } = input;
    const kind = CraftingPlanner.kind(itemType);
    const workshop = quality.workshop ?? 'basic';
    if (!WORKSHOP_QUALITIES.includes(workshop)) throw invalid(`Invalid workshop ${workshop as string}`, 'err-crafting-invalid-workshop');
    const masterwork = quality.masterwork ?? null;
    if (masterwork !== null && !MASTERWORK_KINDS.includes(masterwork)) {
      throw invalid(`Invalid masterwork ${masterwork as string}`, 'err-crafting-invalid-masterwork');
    }
    if (masterwork !== null && kind === 'armor') {
      // Only the torso armor turns an item bonus into DB: a helmet or greaves have no use for it
      throw invalid('Superior craftsmanship gives no bonus to this armor piece', 'err-crafting-masterwork-not-allowed');
    }
    const circumstance = quality.circumstance?.trim() || null;
    if (masterwork === 'circumstantial' && !circumstance) {
      throw invalid('A circumstantial masterwork requires its circumstance', 'err-crafting-circumstance-required');
    }
    const weightPercent = quality.weightPercent || null;
    if (weightPercent !== null && (kind !== 'torso-armor' || !ARMOR_WEIGHT_PERCENTS.includes(weightPercent))) {
      throw invalid(`Invalid armor weight change ${weightPercent}`, 'err-crafting-invalid-weight');
    }
    if (material && !CraftingPlanner.allows(kind, material)) {
      throw invalid(`An item of kind ${kind} cannot be made of ${material.id}`, 'err-crafting-material-not-allowed');
    }

    const bonus = !material
      ? 0
      : quality.replacesMetal && material.metalBonus !== null
        ? material.metalBonus
        : quality.blunt && material.bluntBonus !== null
          ? material.bluntBonus
          : material.bonus;
    const weight = weightPercent !== null ? armorWeightEffects(weightPercent) : null;
    const isArmor = kind === 'torso-armor' || kind === 'armor';
    const weightMultiplier =
      (isArmor && material?.armorWeightMultiplier ? material.armorWeightMultiplier : 1) * (1 + (weightPercent ?? 0) / 100);

    const workability = material?.workability ?? 0;
    const modifiers = [
      { key: 'material-workability', value: workability },
      { key: 'masterwork', value: masterwork ? MASTERWORK_MODIFIERS[masterwork] : 0 },
      { key: 'armor-weight', value: weight?.modifier ?? 0 },
      { key: 'workshop', value: WORKSHOP_MODIFIERS[workshop] },
    ].filter(modifier => modifier.value !== 0);

    const hours = itemType.info.productionHours;
    const productionHours = typeof hours === 'number' ? Math.round(hours * amount * (1 - workability / 100) * 100) / 100 : null;

    const average = itemType.info.cost?.average ?? 0;
    const multiplied = average * (material?.cost.multiplier ?? 1);
    const unitBase = roundGold(multiplied * (1 + (weight?.costPercent ?? 0) / 100));
    const unitMaterial = roundGold((material?.cost.add ?? 0) / (kind === 'ammunition' ? MISSILES_PER_MATERIAL_COST : 1));
    const unitPrice = roundGold(unitBase + unitMaterial);
    const asked = input.materialsCost !== undefined;
    if (asked && input.materialsCost! < 0) throw invalid('The materials cost cannot be negative', 'err-item-invalid-price');
    const materials = asked
      ? roundGold(input.materialsCost!)
      : roundGold(((unitBase * input.materialsPercent) / 100 + unitMaterial) * amount);
    const enhancements = roundGold(input.enhancementsCost ?? 0);
    if (enhancements < 0) throw invalid('The cost cannot be negative', 'err-item-invalid-price');

    return {
      kind,
      amount,
      material: material
        ? { id: material.id, bonus, durability: material.durability, workability: material.workability, magical: material.magical }
        : null,
      bonusTarget: BONUS_TARGET[kind],
      masterwork,
      circumstance: masterwork === 'circumstantial' ? circumstance : null,
      weightPercent,
      weightDb: weight?.db ?? 0,
      weightMultiplier,
      workshop,
      modifiers,
      productionHours,
      cost: { unitBase, unitMaterial, unitPrice, materials, enhancements, total: roundGold(materials + enhancements), asked },
    };
  },
};
