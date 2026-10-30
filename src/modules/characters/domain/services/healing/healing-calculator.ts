import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { HealingTables } from '../../value-objects/healing-tables.vo.js';
import {
  type HealingType,
  type Injury,
  INJURY_SEVERITIES,
  type InjuryRecovery,
  type InjurySeverity,
  type InjuryTreatment,
  type RollModifier,
  type RuleParams,
  type TreatmentProcedure,
  type TreatmentResult,
} from '../../value-objects/injury.vo.js';

/** Values of the patient that feed the recovery roll. */
export interface RecoveryPatient {
  bodyDevelopmentRanks: number;
  constitutionBonus: number;
}

export interface RecoveryModifiers extends RecoveryPatient {
  healingType: HealingType;
  /** Type of healing modifier, including the partial success modifier of the medical maneuver */
  healingTypeModifier: number;
  /** Injury penalty magnitude, subtracted from the roll */
  penalty: number;
  total: number;
  /** The same total entry by entry, with the rules (workspace spec 052). */
  breakdown: RollModifier[];
}

/** Rule references of the healing rolls (Core Law). */
export const HEALING_RULES = { recovery: '§13.1', table: 'Table 13-1a', poison: '§15.6' } as const;

export interface PermanentInjuryResult {
  total: number;
  result: string;
  fraction: number;
  penalty: number;
}

export interface InjuryProgress {
  injury: Injury;
  /** Days actually discounted from the counter */
  days: number;
  /** The counter reached 0 in this step */
  finished: boolean;
}

const MEDIUM_DOUBLES = [22, 44, 66, 88, 100];
const SEVERE_DOUBLES = [11, 22, 33, 44, 55, 66, 77, 88, 99, 100];
const FAILURES: TreatmentResult[] = ['absolute-failure', 'failure'];

const inBand = (value: number, min: number | null, max: number | null): boolean =>
  value >= (min ?? Number.NEGATIVE_INFINITY) && value <= (max ?? Number.POSITIVE_INFINITY);

/** Avoids -0 when negating magnitudes. */
const negative = (magnitude: number): number => (magnitude === 0 ? 0 : -magnitude);

/** Rounds up, ignoring floating point noise (1.5000000001 is 2, 2.0000000001 is 2). */
const ceil = (value: number): number => Math.ceil(Math.round(value * 1e6) / 1e6);

/**
 * Healing computations of Core Law ch. 13 (workspace spec 013, section 4). The numbers come from the healing tables
 * of rmu-api-core; this class only holds the formulas.
 */
export class HealingCalculator {
  constructor(private readonly tables: HealingTables) {}

  /** Severity from the penalty or the bleeding, whichever is worse. */
  severity(penalty: number, bleeding: number | undefined): InjurySeverity {
    const byPenalty = this.severityIndex(Math.abs(penalty || 0), 'maxPenalty');
    const byBleeding = bleeding && bleeding > 0 ? this.severityIndex(bleeding, 'maxBleeding') : 0;
    return INJURY_SEVERITIES[Math.max(byPenalty, byBleeding)];
  }

  private severityIndex(value: number, key: 'maxPenalty' | 'maxBleeding'): number {
    const found = this.tables.severity.find(row => row[key] === null || value <= row[key]);
    const severity = found ? found.severity : 'severe';
    return INJURY_SEVERITIES.indexOf(severity);
  }

  /** Type of healing of a treatment: magic, herbs and the medicine result. */
  static healingType(procedure: TreatmentProcedure, result: TreatmentResult, herbalismSuccess: boolean): HealingType {
    if (procedure === 'magic') return herbalismSuccess ? 'magic-and-herbs' : 'magic-or-herbs';
    if (FAILURES.includes(result)) return 'none';
    if (herbalismSuccess) return 'magic-or-herbs';
    if (result === 'absolute-success') return 'medicine-absolute';
    return 'medicine';
  }

  /**
   * Type of healing modifier of the recovery roll from the latest treatment (untreated: 'none'). The medical maneuver
   * modifier only adds on a partial success: failure and absolute success are already the 'none' and
   * 'medicine-absolute' rows.
   */
  healingTypeModifier(treatment: InjuryTreatment | undefined): { healingType: HealingType; modifier: number } {
    if (!treatment) return { healingType: 'none', modifier: this.tables.healingTypeModifiers.none };
    const base = this.tables.healingTypeModifiers[treatment.healingType] ?? 0;
    const partial = treatment.result === 'partial-success' ? treatment.recoveryModifier || 0 : 0;
    return { healingType: treatment.healingType, modifier: base + partial };
  }

  /** Recovery roll modifiers: Body Development ranks + Co bonus + type of healing - |penalty|. */
  recoveryModifiers(patient: RecoveryPatient, injury: Injury): RecoveryModifiers {
    const latest = HealingCalculator.latestTreatment(injury);
    const { healingType, modifier } = this.healingTypeModifier(latest);
    const penalty = Math.abs(injury.penalty || 0);
    // Workspace spec 052: the treatment, and the partial success of its medical roll, are explained apart
    const partial = latest?.result === 'partial-success' ? latest.recoveryModifier || 0 : 0;
    // Params carry the translation keys of their values, as the MFE labels them
    const treatmentParams: RuleParams = {
      healingType: `healing-type-${healingType}`,
      ...(latest ? { procedure: `procedure-${latest.procedure}` } : {}),
    };
    const breakdown: RollModifier[] = [
      { key: 'body-development-ranks', value: patient.bodyDevelopmentRanks, group: 'skill', rule: HEALING_RULES.recovery },
      { key: 'constitution-bonus', value: patient.constitutionBonus, group: 'skill', rule: HEALING_RULES.recovery },
      { key: 'healing-type', value: modifier - partial, group: 'situation', rule: HEALING_RULES.table, params: treatmentParams },
      ...(partial ? [{ key: 'partial-success', value: partial, group: 'situation' as const, rule: HEALING_RULES.recovery }] : []),
      { key: 'injury-penalty', value: -penalty, group: 'penalty', rule: HEALING_RULES.recovery },
    ];
    return {
      bodyDevelopmentRanks: patient.bodyDevelopmentRanks,
      constitutionBonus: patient.constitutionBonus,
      healingType,
      healingTypeModifier: modifier,
      penalty,
      total: patient.bodyDevelopmentRanks + patient.constitutionBonus + modifier - penalty,
      breakdown,
    };
  }

  /** Days of the recovery column for the injury type, times the severity and the head multipliers. */
  baseDays(injury: Pick<Injury, 'type' | 'severity' | 'location'>, total: number): number {
    if (injury.type === 'unknown') {
      throw new ValidationError('The injury type must be set before the recovery roll', 'err-injury-type-required');
    }
    const row = this.tables.recoveryDays.find(r => inBand(total, r.min, r.max));
    if (!row) throw new ValidationError(`Recovery roll ${total} out of the table bounds`, 'err-healing-table-out-of-range');
    const days = row.days[injury.type];
    const severity = this.tables.severityMultipliers[injury.severity] ?? 1;
    const head = injury.location === 'head' ? this.tables.headMultiplier : 1;
    return days * severity * head;
  }

  /**
   * Where the days of a recovery come from (workspace spec 052): the row of the total and the column of the injury
   * type, the severity and head multipliers, and the race and talent ones (each talent by its id).
   */
  daysExplanation(
    injury: Pick<Injury, 'type' | 'severity' | 'location'>,
    total: number,
    raceMultiplier: number | undefined,
    traitIds: string[],
  ): RuleParams {
    const row = this.tables.recoveryDays.find(r => inBand(total, r.min, r.max));
    const talents = this.tables.talentMultipliers || {};
    const params: RuleParams = {
      column: `injury-type-${injury.type}`,
      ...(row && injury.type !== 'unknown' ? { days: row.days[injury.type] } : {}),
      severity: injury.severity,
      severityMultiplier: this.tables.severityMultipliers[injury.severity] ?? 1,
      ...(injury.location === 'head' ? { headMultiplier: this.tables.headMultiplier } : {}),
      raceMultiplier: raceMultiplier && raceMultiplier > 0 ? raceMultiplier : 1,
    };
    [...new Set(traitIds)].filter(id => talents[id] !== undefined).forEach(id => (params[id] = talents[id]));
    return params;
  }

  /** Race recovery multiplier times the talent and flaw multipliers (Fast Healer, Slow Healer). */
  recoveryMultiplier(raceMultiplier: number | undefined, traitIds: string[]): number {
    const race = raceMultiplier && raceMultiplier > 0 ? raceMultiplier : 1;
    const talents = this.tables.talentMultipliers || {};
    return [...new Set(traitIds)].reduce((acc, id) => acc * (talents[id] ?? 1), race);
  }

  static totalDays(baseDays: number, multiplier: number): number {
    return Math.max(1, ceil(baseDays * multiplier));
  }

  recovery(injury: Injury, roll: number, modifiers: number, multiplier: number, now: string): InjuryRecovery {
    const total = roll + modifiers;
    const baseDays = this.baseDays(injury, total);
    const totalDays = HealingCalculator.totalDays(baseDays, multiplier);
    const latest = HealingCalculator.latestTreatment(injury);
    return {
      roll,
      modifiers,
      total,
      baseDays,
      multiplier,
      totalDays,
      remainingDays: totalDays,
      startedAt: now,
      ...(latest ? { treatmentId: latest.id } : {}),
      untreated: HealingCalculator.isUntreated(injury),
    };
  }

  static latestTreatment(injury: Pick<Injury, 'treatments'>): InjuryTreatment | undefined {
    return injury.treatments.length > 0 ? injury.treatments[injury.treatments.length - 1] : undefined;
  }

  /** Without care: no treatment, or the latest one failed (its type of healing is 'none'). */
  static isUntreated(injury: Pick<Injury, 'treatments'>): boolean {
    const latest = HealingCalculator.latestTreatment(injury);
    return !latest || latest.healingType === 'none';
  }

  /** One recovery roll per treatment (spec 022, D10): a new roll needs a treatment after the last one. */
  static isRecoveryRolled(injury: Injury): boolean {
    if (!injury.recovery) return false;
    return injury.recovery.treatmentId === HealingCalculator.latestTreatment(injury)?.id;
  }

  /**
   * Medium injuries check even doubles of the unmodified roll, severe injuries any doubles. An untreated injury always
   * becomes permanent, light ones too (spec 022, D3): its permanent roll is always required.
   */
  static isPermanentCheckRequired(severity: InjurySeverity, roll: number, untreated = false): boolean {
    if (untreated) return true;
    if (severity === 'medium') return MEDIUM_DOUBLES.includes(roll);
    if (severity === 'severe') return SEVERE_DOUBLES.includes(roll);
    return false;
  }

  /** Second recovery roll (same modifiers): fraction of the initial penalty that stays. */
  permanentPenalty(initialPenalty: number, roll: number, modifiers: number): PermanentInjuryResult {
    const total = roll + modifiers;
    const row = this.tables.permanentInjury.find(r => inBand(total, r.min, r.max));
    if (!row) throw new ValidationError(`Permanent injury roll ${total} out of the table bounds`, 'err-healing-table-out-of-range');
    return { total, result: row.result, fraction: row.fraction, penalty: negative(Math.round(Math.abs(initialPenalty) * row.fraction)) };
  }

  /** Hits after resting: a percentage of the maximum per complete rest period, up to the maximum. */
  restHp(max: number, current: number, hours: number): number {
    if (current >= max || hours <= 0) return current;
    const periods = Math.floor(hours / this.tables.restPeriodHours);
    const gain = Math.floor((periods * max * this.tables.restHpPercentPerPeriod) / 100);
    return Math.min(max, current + gain);
  }

  /** Days discounted from the counters: complete rest counts more. */
  restDays(days: number, fullRest: boolean): number {
    return Math.max(0, days) * (fullRest ? this.tables.fullRestDayMultiplier : 1);
  }

  /**
   * Daily reduction front-loaded (§13.1 Recovery): with a magnitude `m` over `t` days, each day takes `floor(m / t)`
   * and the first `m mod t` days take one more. Penalty after `t - remaining` elapsed days.
   */
  static penaltyAfter(initialPenalty: number, totalDays: number, remainingDays: number): number {
    const magnitude = Math.abs(initialPenalty);
    if (totalDays <= 0 || remainingDays <= 0) return 0;
    const days = Math.round(totalDays);
    const elapsed = Math.min(days, Math.max(0, Math.floor(totalDays - remainingDays)));
    const daily = Math.floor(magnitude / days);
    const extra = magnitude % days;
    return negative(Math.max(0, magnitude - (elapsed * daily + Math.min(elapsed, extra))));
  }

  /** An injury improves with time after its recovery roll, untreated ones too (at the 'none' modifier, spec 022 D3). */
  static canImprove(injury: Injury): boolean {
    if (!injury.recovery || injury.recovery.remainingDays <= 0) return false;
    return injury.status === 'active' || injury.status === 'recovering';
  }

  /** Discounts days from the injury counter. At 0 the injury heals or becomes permanent. */
  static advance(injury: Injury, days: number, now: string): InjuryProgress {
    if (days <= 0 || !HealingCalculator.canImprove(injury)) return { injury, days: 0, finished: false };
    const recovery = injury.recovery!;
    const remainingDays = Math.max(0, recovery.remainingDays - days);
    const discounted = recovery.remainingDays - remainingDays;
    const next: Injury = { ...injury, recovery: { ...recovery, remainingDays }, updatedAt: now };
    if (remainingDays > 0) {
      next.status = 'recovering';
      next.penalty = HealingCalculator.penaltyAfter(injury.initialPenalty, recovery.totalDays, remainingDays);
      return { injury: next, days: discounted, finished: false };
    }
    next.bleeding = injury.bleeding ? 0 : injury.bleeding;
    // Untreated: permanent with the penalty of its permanent roll, or all of it when that roll was not made
    if (recovery.untreated && !injury.permanent && injury.initialPenalty < 0) {
      next.status = 'permanent';
      next.penalty = negative(Math.abs(injury.initialPenalty));
      next.permanent = { penalty: next.penalty };
    } else if (injury.permanent && injury.permanent.penalty < 0) {
      next.status = 'permanent';
      next.penalty = injury.permanent.penalty;
    } else {
      next.status = 'healed';
      next.penalty = 0;
      next.healedAt = now;
    }
    return { injury: next, days: discounted, finished: true };
  }
}
