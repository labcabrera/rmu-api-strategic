import { ValidationError } from '../../../../shared/domain/errors/errors';
import { HealingTables } from '../../value-objects/healing-tables.vo';
import {
  HealingType,
  Injury,
  INJURY_SEVERITIES,
  InjuryRecovery,
  InjurySeverity,
  InjuryTreatment,
  TreatmentProcedure,
  TreatmentResult,
} from '../../value-objects/injury.vo';

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
}

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
    const latest = injury.treatments.length > 0 ? injury.treatments[injury.treatments.length - 1] : undefined;
    const { healingType, modifier } = this.healingTypeModifier(latest);
    const penalty = Math.abs(injury.penalty || 0);
    return {
      bodyDevelopmentRanks: patient.bodyDevelopmentRanks,
      constitutionBonus: patient.constitutionBonus,
      healingType,
      healingTypeModifier: modifier,
      penalty,
      total: patient.bodyDevelopmentRanks + patient.constitutionBonus + modifier - penalty,
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
    return { roll, modifiers, total, baseDays, multiplier, totalDays, remainingDays: totalDays, startedAt: now };
  }

  /** Medium injuries check even doubles of the unmodified roll, severe injuries any doubles. */
  static isPermanentCheckRequired(severity: InjurySeverity, roll: number): boolean {
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

  /** Linear reduction, more on the first days: penalty after `elapsed` of `total` days. */
  static penaltyAfter(initialPenalty: number, totalDays: number, remainingDays: number): number {
    const magnitude = Math.abs(initialPenalty);
    if (totalDays <= 0 || remainingDays <= 0) return 0;
    const elapsed = Math.max(0, totalDays - remainingDays);
    return negative(Math.max(0, magnitude - ceil((magnitude * elapsed) / totalDays)));
  }

  /** An injury improves with time only after the recovery roll; untreated medium and severe injuries do not. */
  static canImprove(injury: Injury): boolean {
    if (!injury.recovery || injury.recovery.remainingDays <= 0) return false;
    if (injury.status !== 'active' && injury.status !== 'recovering') return false;
    if (injury.treatments.length === 0 && injury.severity !== 'light') return false;
    return true;
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
    if (injury.permanent && injury.permanent.penalty < 0) {
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
