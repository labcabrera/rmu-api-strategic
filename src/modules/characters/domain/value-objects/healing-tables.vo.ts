import type { Difficulty } from './difficulty.vo.js';
import type { Pace } from './character-movement.vo.js';
import type { BodyLocation, HealingType, InjurySeverity, InjuryType, TreatmentProcedure, TreatmentResult } from './injury.vo.js';

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

/** Workspace spec 068: a band of absolute maneuver totals of a cauterization (Table 13-1c of core). */
export interface CauterizationRow {
  min: number | null;
  max: number | null;
  result: TreatmentResult;
  bleeding: 'unchanged' | 'halved' | 'stopped';
  heatSeverity: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  /** Number of d10 of hits */
  hitsDice: number;
}

/** Workspace spec 068: an injury type and severity that only surgery (or magic) treats. */
export interface SurgeryRequirement {
  injuryType: InjuryType;
  severity: InjurySeverity;
}

/** Workspace spec 068: what a splint or a cast limits, by location. */
export interface TreatmentLimitsRules {
  splint: { leg: { pace: Pace }; arm: { limbUnusable: boolean } };
  cast: { leg: { pace: Pace; cane: Pace; crutches: Pace }; maneuverPenaltyFactor: number };
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
  /**
   * Workspace spec 068. Missing in core versions before it, empty or null in documents imported before it: see
   * InjuryTreatmentRules for what happens without each one.
   */
  cauterization?: CauterizationRow[] | null;
  cauterizationUnusualRoll?: number | null;
  surgeryRequired?: SurgeryRequirement[] | null;
  treatmentLimits?: TreatmentLimitsRules | null;
  salveModifier?: { min: number; max: number } | null;
}
