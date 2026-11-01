import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { AlchemyFailureTable, PowerLevel, SpellAlchemy, SpellAlchemyEffect } from '../value-objects/alchemy.vo.js';

/** Scope of a spell in an enchantment (Treasure Law 5.3): doubled costs twice the days and PP, halved half (rounded up). */
export const ENCHANTMENT_SCOPES = ['normal', 'doubled', 'halved'] as const;
export type EnchantmentScope = (typeof ENCHANTMENT_SCOPES)[number];
const SCOPE_FACTORS: Record<EnchantmentScope, number> = { normal: 1, doubled: 2, halved: 0.5 };

/** Spell type of rmu-api-spells that makes an enchantment possible. */
export const ALCHEMICAL_SPELL_TYPE = 'alchemical';

/** Failure table of a spell without alchemy metadata (a non-alchemical spell embedded in the item). */
export const DEFAULT_FAILURE_TABLE: AlchemyFailureTable = 'spell-power';

/** Base labour of a working day, and one more silver piece per full 40 PP cast that day (Treasure Law 5.3). */
export const LABOR_SP_PER_DAY = 2;
export const PP_PER_EXTRA_LABOR_SP = 40;
export const SILVER_PER_GOLD = 10;

export const PP_ABOVE_CHARACTER_PP = 'pp-per-day-above-character-pp';

export interface ScrModifier {
  key: string;
  value: number;
}

/** A spell of the request with what the grimoire and the catalog say about it. */
export interface EnchantmentPlannerSpell {
  spellId: string;
  name: string;
  level: number;
  listId: string;
  listCode: string;
  listSkillId: string;
  type: string | null;
  scope?: EnchantmentScope | null;
  target?: string | null;
  alchemy: SpellAlchemy | null;
  /** Ranks of the list, realm stat and list type (spec 029). */
  scrModifiers: ScrModifier[];
}

export interface EnchantmentPlannerInput {
  spells: EnchantmentPlannerSpell[];
  batchSize: number;
  powerLevel: PowerLevel;
  powerMultiplier: number;
  /** Bonus of the material of the item; 0 when its kind does not take it off the days. */
  materialBonus: number;
  /** Gold the base items are worth: the unit value times the batch. */
  baseValue: number;
  /** Power points of the alchemist (its maximum); null when it has none. */
  alchemistPP: number | null;
}

export interface EnchantmentPlanSpell {
  spellId: string;
  name: string;
  level: number;
  listId: string;
  listCode: string;
  listSkillId: string;
  type: string | null;
  scope: EnchantmentScope;
  /** Working days it adds (and PP of each cast): level × scope, rounded up */
  days: number;
  pp: number;
  /** Casts a day: the batch size when it is cast per unit, otherwise 1 */
  casts: number;
  perItem: boolean;
  failureTable: AlchemyFailureTable;
  effect: SpellAlchemyEffect | null;
  target: string | null;
  scrModifiers: ScrModifier[];
  scrBonus: number;
}

/** Budget of an enchantment (workspace spec 064, decision 6). Amounts in gold. */
export interface EnchantmentPlan {
  spells: EnchantmentPlanSpell[];
  batchSize: number;
  powerLevel: PowerLevel;
  powerMultiplier: number;
  baseDays: number;
  /** Days the material bonus takes off */
  materialBonusReduction: number;
  workingDays: number;
  ppPerDay: number;
  itemLevel: number;
  /** Materials and labour before the power level multiplier */
  materialCost: number;
  laborCost: number;
  /** (materials + labour) × power multiplier */
  enchantmentCost: number;
  /** Materials × power multiplier: what the payer gives when the work starts */
  paidAtStart: number;
  /** Base items plus the enchantment cost */
  marketValue: number;
  maxAlchemists: number;
  warnings: string[];
}

/** Gold with two decimals (the plan of workspace spec 064). */
export const round2 = (gold: number): number => Math.round(gold * 100) / 100;

const invalid = (message: string, code: string) => new ValidationError(message, code);

/**
 * The rules of an enchantment (Treasure Law 5.3, workspace spec 064 decision 6), the only source of them: the MFE
 * shows what this returns. Costs are worked out in silver, as the book prices them, and returned in gold.
 */
export const EnchantmentPlanner = {
  scopeFactor(scope: EnchantmentScope): number {
    return SCOPE_FACTORS[scope];
  },

  plan(input: EnchantmentPlannerInput): EnchantmentPlan {
    const { batchSize, powerMultiplier } = input;
    if (input.spells.length === 0) throw invalid('An enchantment needs at least one spell', 'err-enchantment-no-alchemical-spell');
    if (!input.spells.some(spell => spell.type === ALCHEMICAL_SPELL_TYPE)) {
      throw invalid('An enchantment needs at least one alchemical spell', 'err-enchantment-no-alchemical-spell');
    }
    if (!Number.isInteger(batchSize) || batchSize < 1) throw invalid(`Invalid batch size ${batchSize}`, 'err-enchantment-batch-invalid');
    if (!(powerMultiplier > 0)) throw invalid(`Invalid power multiplier ${powerMultiplier}`, 'validation');

    const spells = input.spells.map(spell => EnchantmentPlanner.planSpell(spell, batchSize));
    const baseDays = spells.reduce((total, spell) => total + spell.days, 0);
    const materialBonus = Math.max(0, input.materialBonus || 0);
    const workingDays = Math.max(Math.ceil(baseDays / 2), baseDays - materialBonus);
    const ppPerDay = spells.reduce((total, spell) => total + spell.pp * spell.casts, 0);
    const itemLevel = Math.max(...spells.map(spell => spell.level));

    const materialSp = itemLevel * workingDays;
    const laborSp = workingDays * (LABOR_SP_PER_DAY + Math.floor(ppPerDay / PP_PER_EXTRA_LABOR_SP));
    const enchantmentCost = round2(((materialSp + laborSp) * powerMultiplier) / SILVER_PER_GOLD);
    const warnings = ppPerDay > (input.alchemistPP ?? 0) ? [PP_ABOVE_CHARACTER_PP] : [];
    return {
      spells,
      batchSize,
      powerLevel: input.powerLevel,
      powerMultiplier,
      baseDays,
      materialBonusReduction: baseDays - workingDays,
      workingDays,
      ppPerDay,
      itemLevel,
      materialCost: round2(materialSp / SILVER_PER_GOLD),
      laborCost: round2(laborSp / SILVER_PER_GOLD),
      enchantmentCost,
      paidAtStart: round2((materialSp * powerMultiplier) / SILVER_PER_GOLD),
      marketValue: round2(Math.max(0, input.baseValue || 0) + enchantmentCost),
      maxAlchemists: spells.length,
      warnings,
    };
  },

  planSpell(spell: EnchantmentPlannerSpell, batchSize: number): EnchantmentPlanSpell {
    const scope = spell.scope ?? 'normal';
    if (!(scope in SCOPE_FACTORS)) throw invalid(`Invalid scope ${scope as string}`, 'validation');
    const days = Math.ceil(spell.level * SCOPE_FACTORS[scope]);
    // A spell without alchemy metadata is embedded once and fails on the spell power table
    const perItem = spell.alchemy?.perItem ?? false;
    return {
      spellId: spell.spellId,
      name: spell.name,
      level: spell.level,
      listId: spell.listId,
      listCode: spell.listCode,
      listSkillId: spell.listSkillId,
      type: spell.type,
      scope,
      days,
      pp: days,
      casts: perItem ? batchSize : 1,
      perItem,
      failureTable: spell.alchemy?.failureTable ?? DEFAULT_FAILURE_TABLE,
      effect: spell.alchemy?.effect ? { kind: spell.alchemy.effect.kind, value: spell.alchemy.effect.value } : null,
      target: spell.target?.trim() || null,
      scrModifiers: spell.scrModifiers.map(modifier => ({ ...modifier })),
      scrBonus: spell.scrModifiers.reduce((total, modifier) => total + modifier.value, 0),
    };
  },
};
