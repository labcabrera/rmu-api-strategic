import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Biome, HerbEffects, ItemHerb } from '../../../../items/domain/value-objects/item-catalog-info.vo.js';
import { DIFFICULTY_MODIFIERS, isDifficulty } from '../../value-objects/difficulty.vo.js';
import type { InjuryType, TreatmentProcedure, TreatmentResult } from '../../value-objects/injury.vo.js';

/** Treasure Law 2.3: a herb that treats the injury adds this to the Medicine roll, and so does a mundane one. */
export const HERB_MEDICINE_BONUS = 25;
/** A magical herb that treats the injury adds this to the recovery roll; with a healing spell too, the next one. */
export const HERB_RECOVERY_BONUS = 50;
export const HERB_AND_MAGIC_RECOVERY_BONUS = 75;
/** Each search repeated in the same area. */
export const PREVIOUS_SEARCH_PENALTY = -10;
/** Hours of a search, halved in a familiar area. */
export const HERB_SEARCH_HOURS = 10;

/** What a herb gives a treatment (workspace spec 062). */
export interface HerbTreatmentBonus {
  medicineBonus: number;
  recoveryBonus: number;
  /** The herb treats the injury: the treatment counts as one with herbs (type of healing). */
  treats: boolean;
}

/** A herb searched for, with its catalog data. */
export interface HerbSearchTarget {
  itemTypeId: string;
  herb: Pick<ItemHerb, 'biomes' | 'highAltitude' | 'find'>;
}

export interface HerbSearchInput {
  biome: Biome;
  highAltitude: boolean;
  /** Roll plus skill bonus plus the modifiers of the client (complementary skills...). */
  base: number;
  previousSearches: number;
}

/** The maneuver of one herb before the table: what is added to the base. */
export interface HerbSearchManeuver {
  itemTypeId: string;
  /** False: not in this biome (or altitude), no roll. */
  here: boolean;
  difficulty: string | null;
  modifiers: { key: string; value: number }[];
  total: number;
}

export type HerbSearchResult = 'found' | 'not-found' | 'absolute-failure' | 'not-here';

const SUCCESSES: TreatmentResult[] = ['success', 'absolute-success'];

/** A d10 roll, 1 to 10. */
export const rollD10 = (random: () => number = Math.random): number => 1 + Math.floor(random() * 10);

/**
 * Herbs in play (workspace spec 062, Treasure Law 2.3): what a dose heals, what it gives a treatment, and the
 * maneuver and doses of a search. Pure: the dice come from the callers.
 */
export const HerbRules = {
  /** The heal range of a herb usable out of combat, or 400 herb-without-effect (stun relief is tactical only). */
  healRange(effects: HerbEffects | null | undefined): { min: number; max: number } {
    const heal = effects?.heal;
    if (!heal || !(heal.max > 0)) {
      throw new ValidationError('The herb has no effect usable out of combat', 'herb-without-effect');
    }
    return heal;
  },

  /** A whole number of hits in the range. */
  rollHeal(range: { min: number; max: number }, random: () => number = Math.random): number {
    const min = Math.ceil(Math.min(range.min, range.max));
    const max = Math.floor(Math.max(range.min, range.max));
    return min + Math.floor(random() * (max - min + 1));
  },

  /**
   * Bonuses of a herb in a treatment: a mundane herb +25 to Medicine; a herb that treats the injury (its kind or any)
   * +25 to Medicine and +50 to the recovery roll (+75 with a healing spell). A magical herb that does not treat the
   * injury is 400 herb-not-applicable.
   */
  treatment(herb: Pick<ItemHerb, 'magical' | 'effects'>, injuryType: InjuryType, procedure: TreatmentProcedure): HerbTreatmentBonus {
    const treats = herb.effects?.treats ?? [];
    const applies = treats.includes('any') || treats.includes(injuryType);
    if (herb.magical === false) {
      return { medicineBonus: HERB_MEDICINE_BONUS, recoveryBonus: 0, treats: applies };
    }
    if (!applies) throw new ValidationError(`The herb does not treat a ${injuryType} injury`, 'herb-not-applicable');
    const extra = herb.effects?.recoveryBonus ?? 0;
    return {
      medicineBonus: HERB_MEDICINE_BONUS,
      recoveryBonus: (procedure === 'magic' ? HERB_AND_MAGIC_RECOVERY_BONUS : HERB_RECOVERY_BONUS) + extra,
      treats: true,
    };
  },

  /** Modifier of the Find code of a herb (`n` is the `ni` of strategic); unknown codes are medium. */
  findModifier(find: string | null | undefined): number {
    const code = find === 'n' ? 'ni' : find;
    return isDifficulty(code) ? DIFFICULTY_MODIFIERS[code] : 0;
  },

  /** Several herbs at once: twice their number, accumulated for each one in order (2 herbs: -4, -8). */
  severalHerbsPenalty(count: number, index: number): number {
    return count > 1 ? -2 * count * (index + 1) : 0;
  },

  /** The herb grows here: the biome is one of its biomes and the altitude matches. */
  grows(herb: Pick<ItemHerb, 'biomes' | 'highAltitude'>, biome: Biome, highAltitude: boolean): boolean {
    return (herb.biomes ?? []).includes(biome) && !!herb.highAltitude === highAltitude;
  },

  /** The maneuver of each herb: the base, its difficulty, the repeated searches and the several herbs penalty. */
  maneuvers(targets: HerbSearchTarget[], input: HerbSearchInput): HerbSearchManeuver[] {
    return targets.map((target, index) => {
      if (!HerbRules.grows(target.herb, input.biome, input.highAltitude)) {
        return { itemTypeId: target.itemTypeId, here: false, difficulty: target.herb.find ?? null, modifiers: [], total: 0 };
      }
      const modifiers = [
        { key: 'difficulty', value: HerbRules.findModifier(target.herb.find) },
        { key: 'previous-searches', value: PREVIOUS_SEARCH_PENALTY * Math.max(0, input.previousSearches) },
        { key: 'several-herbs', value: HerbRules.severalHerbsPenalty(targets.length, index) },
      ].filter(modifier => modifier.value !== 0);
      return {
        itemTypeId: target.itemTypeId,
        here: true,
        difficulty: target.herb.find ?? null,
        modifiers,
        total: input.base + modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
      };
    });
  },

  /** Result of the absolute maneuver of a herb. */
  result(maneuver: TreatmentResult): Exclude<HerbSearchResult, 'not-here'> {
    if (maneuver === 'absolute-failure') return 'absolute-failure';
    return SUCCESSES.includes(maneuver) ? 'found' : 'not-found';
  },

  /** Doses found: 1d10, plus 1 for every full 10 over 100. */
  doses(total: number, d10: number): number {
    return d10 + (total > 100 ? Math.floor((total - 100) / 10) : 0);
  },

  /** Hours of the search, halved in a familiar area (only reported). */
  hours(familiar: boolean): number {
    return familiar ? HERB_SEARCH_HOURS / 2 : HERB_SEARCH_HOURS;
  },
};
