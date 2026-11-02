import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { MagicBonusKind, MagicItemBonus, MagicItemFeature, MagicItemSpell } from '../value-objects/item-catalog-info.vo.js';
import type { MagicItemKind } from '../value-objects/item-enchantment.vo.js';
import type { StandardBonusRow, StandardPricing } from '../value-objects/treasure-tables.vo.js';
import { roundGold } from './price-calculator.js';

/** Silver in a gold piece. */
export const SILVER_PER_GOLD = 10;

export const STANDARD_MAGIC_TABLES = ['weapon', 'ranged', 'armor', 'shield', 'general-bonus'] as const;
export type StandardMagicTable = (typeof STANDARD_MAGIC_TABLES)[number];

/** A standard enhancement of chapter 6 (6-2, 6-5, 6-6, 6-1e): the table, the bonus and the material of a general bonus. */
export interface StandardMagicRequest {
  table: StandardMagicTable;
  bonus: number;
  material?: string | null;
}

/** What makes a magic item (workspace spec 067, decision 7): `MagicItemRequest` of plan section 3, without its base. */
export interface MagicItemDesign {
  kind: MagicItemKind;
  itemLevel?: number | null;
  bonuses: MagicItemBonus[];
  spells: MagicItemSpell[];
  charges?: number | null;
  attunement?: boolean;
  /** Gold; null asks for the quote. */
  price?: number | null;
  standard?: StandardMagicRequest | null;
}

export interface MagicItemQuote {
  days: number;
  itemLevel: number;
  /** Gold of one unit, base item included. */
  price: number;
  breakdown: string[];
}

export interface MagicItemQuoteInput {
  design: MagicItemDesign;
  /** Gold of the base item. */
  baseValue: number;
  /** Armor type of the base item, for the table 6-2 of armor. */
  baseAt: number | null;
  pricing: StandardPricing | null;
  powerMultiplier: number;
}

/** The bonus a standard table gives: an OB for weapons, a DB for armor and shields. */
const STANDARD_BONUS: Record<StandardMagicTable, MagicBonusKind | null> = {
  weapon: 'ob',
  ranged: 'ob',
  armor: 'db',
  shield: 'shield',
  'general-bonus': null,
};

/** Extra silver per day by the PP per day when core has no table 6-1a: 2 sp, and 1 more per 40 PP (spec 064). */
const fallbackExtraSp = (ppPerDay: number) => 2 + Math.floor(ppPerDay / 40);

/**
 * Pure price rules of a magic item made by the game master (workspace spec 067, decisions 6 and 7):
 * - a standard enhancement takes its days, level and price from the tables of chapter 6 kept in core;
 * - the spells follow the formula of table 6-1a: days = the sum of their levels, PP per day = those days, price per
 *   day = item level + the extra silver of its PP band; the silver of the days goes to gold;
 * - the power level multiplies only that magic part (decision 6), never the base item;
 * - an explicit price wins over the quote.
 */
export const MagicItemPricing = {
  quote(input: MagicItemQuoteInput): MagicItemQuote {
    const { design, pricing } = input;
    const breakdown: string[] = [`base: ${roundGold(input.baseValue)} gp`];
    const standard = design.standard ? MagicItemPricing.standardRow(design.standard, pricing, input.baseAt) : null;
    if (standard && design.standard) {
      breakdown.push(`standard ${design.standard.table} +${design.standard.bonus}: ${standard.days} days, ${standard.price} sp`);
    }

    const spells = design.spells ?? [];
    const formulaDays = spells.reduce((sum, spell) => sum + Math.max(0, spell.level), 0);
    const spellLevel = spells.reduce((max, spell) => Math.max(max, spell.level), 0);
    const itemLevel = Math.max(design.itemLevel ?? 0, standard?.level ?? 0, spellLevel);
    let formulaSp = 0;
    if (formulaDays > 0) {
      const ppPerDay = formulaDays;
      const band = pricing?.pricePerDay?.find(row => ppPerDay >= row.ppMin && (row.ppMax === null || ppPerDay <= row.ppMax));
      const extraSp = band ? band.extraSp : fallbackExtraSp(ppPerDay);
      const pricePerDay = itemLevel + extraSp;
      formulaSp = formulaDays * pricePerDay;
      breakdown.push(`spells: ${formulaDays} days x ${pricePerDay} sp (level ${itemLevel} + ${extraSp} sp for ${ppPerDay} PP/day)`);
    }

    const magicGold = roundGold((((standard?.price ?? 0) + formulaSp) / SILVER_PER_GOLD) * input.powerMultiplier);
    if (input.powerMultiplier !== 1) breakdown.push(`power level: x${input.powerMultiplier}`);
    breakdown.push(`magic: ${magicGold} gp`);
    const quoted = roundGold(input.baseValue + magicGold);
    const explicit = design.price !== undefined && design.price !== null;
    if (explicit) breakdown.push(`asked price: ${design.price} gp`);
    return {
      days: (standard?.days ?? 0) + formulaDays,
      itemLevel,
      price: explicit ? roundGold(design.price!) : quoted,
      breakdown,
    };
  },

  /** The row of a standard enhancement. 400 when core has no tables or the table has no such bonus. */
  standardRow(request: StandardMagicRequest, pricing: StandardPricing | null, baseAt: number | null): StandardBonusRow {
    if (!pricing) throw new ValidationError('Core has no treasure tables imported', 'err-treasure-tables-missing');
    let rows: StandardBonusRow[] | undefined;
    switch (request.table) {
      case 'weapon':
        rows = pricing.weapon;
        break;
      case 'ranged':
        rows = pricing.ranged;
        break;
      case 'shield':
        rows = pricing.shield;
        break;
      case 'armor':
        rows = pricing.armor?.find(entry => entry.at === baseAt)?.rows;
        break;
      case 'general-bonus':
        rows = pricing.generalBonus?.find(entry => entry.material === request.material)?.rows;
        break;
    }
    const row = rows?.find(candidate => candidate.bonus === request.bonus);
    if (!row) {
      throw new ValidationError(
        `The standard table ${request.table} has no +${request.bonus}${request.table === 'armor' ? ` for AT ${baseAt}` : ''}`,
        'err-magic-item-standard-unknown',
      );
    }
    return row;
  },

  /**
   * The magic block of the new item: the design with its quote. A standard enhancement adds its OB or DB bonus when
   * the design does not list one of that kind.
   */
  feature(design: MagicItemDesign, quote: MagicItemQuote, baseValue: number): MagicItemFeature {
    const bonuses = [...(design.bonuses ?? [])].map(bonus => ({ ...bonus }));
    const implied = design.standard ? STANDARD_BONUS[design.standard.table] : null;
    if (design.standard && implied && !bonuses.some(bonus => bonus.kind === implied)) {
      bonuses.push({ kind: implied, value: design.standard.bonus, target: null, against: null });
    }
    return {
      itemLevel: quote.itemLevel,
      kind: design.kind,
      days: quote.days,
      standardPrice: quote.price,
      basePrice: roundGold(baseValue),
      attunement: !!design.attunement,
      charges: design.charges ?? null,
      realm: null,
      bonuses,
      spells: (design.spells ?? []).map(spell => ({ ...spell })),
      section: null,
    };
  },
};
