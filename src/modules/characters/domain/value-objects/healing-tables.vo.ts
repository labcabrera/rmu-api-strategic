import { HealingType, InjurySeverity, InjuryType } from './injury.vo';

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
}
