import type { Difficulty } from './difficulty.vo.js';
import type { BodyLocation, HealingType, InjurySeverity, InjuryType, TreatmentProcedure } from './injury.vo.js';

/** Injury types with a recovery column ('unknown' has none). */
export type RecoveryInjuryType = Exclude<InjuryType, 'unknown'>;

export interface RecoveryDaysRow {
  min: number | null;
  max: number | null;
  days: Record<RecoveryInjuryType, number>;
}

export interface SeverityThreshold {
  severity: InjurySeverity;
  maxPenalty: number | null;
  maxBleeding: number | null;
}

export interface PermanentInjuryRow {
  min: number | null;
  max: number | null;
  result: string;
  fraction: number;
}

/**
 * Difficulty of a treatment procedure on an injury type and severity (spec 022): a maneuver difficulty key. No row
 * means that the procedure does not apply; magic and herbs are not Medicine maneuvers and have none.
 */
export interface TreatmentDifficultyRow {
  procedure: TreatmentProcedure;
  injuryType: InjuryType;
  severity: InjurySeverity;
  difficulty: Difficulty;
}

/** Rules of the treatments that go with `treatmentDifficulties` (spec 022). */
export interface TreatmentRules {
  /** Difficulty steps harder on the head */
  headDifficultySteps: number;
  /** Modifier per point of bleeding when cauterizing (negative) */
  cauterizePenaltyPerBleeding: number;
  bleedingProcedures: TreatmentProcedure[];
  tourniquetLocations: BodyLocation[];
}

/**
 * Healing tables read from rmu-api-core (GET /v1/healing-tables). The values are rulebook content and are never
 * written in this repository.
 */
export interface HealingTables {
  recoveryDays: RecoveryDaysRow[];
  severityMultipliers: Record<InjurySeverity, number>;
  headMultiplier: number;
  severity: SeverityThreshold[];
  healingTypeModifiers: Record<HealingType, number>;
  herbalismBonus: number;
  permanentInjury: PermanentInjuryRow[];
  restHpPercentPerPeriod: number;
  restPeriodHours: number;
  fullRestDayMultiplier: number;
  talentMultipliers: Record<string, number>;
  /**
   * Spec 022. Missing in core versions before it and empty in documents imported before it: the treatments then use
   * the medium difficulty and the default rules.
   */
  treatmentDifficulties?: TreatmentDifficultyRow[];
  treatmentRules?: TreatmentRules;
}
