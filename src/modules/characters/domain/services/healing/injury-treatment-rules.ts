import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { DIFFICULTIES, DIFFICULTY_MODIFIERS, type Difficulty, isDifficulty } from '../../value-objects/difficulty.vo.js';
import type { HealingTables, TreatmentRules } from '../../value-objects/healing-tables.vo.js';
import type { BleedingControl, Injury, InjuryTreatment, TreatmentProcedure, TreatmentResult } from '../../value-objects/injury.vo.js';
import { HealingCalculator } from './healing-calculator.js';

/** Difficulty of a procedure on an injury, computed on the server (spec 022, D4/D5). */
export interface TreatmentDifficulty {
  procedure: TreatmentProcedure;
  /** Difficulty key after the head step (none for magic and herbs) */
  grade?: Difficulty;
  /** Steps harder because the injury is on the head */
  headSteps: number;
  /** Modifier of the difficulty, head step included */
  base: number;
  /** Extra modifier of cauterizing a bleeding wound */
  bleedingModifier: number;
  /** Total difficulty modifier of the Medicine roll */
  difficulty: number;
  /** A row of the core table matched; false means the medium default (no table, or magic and herbs) */
  matched: boolean;
  /**
   * The procedure applies to the injury: the core table has a row for it, or core has no table yet. Magic and herbs
   * always apply.
   */
  applicable: boolean;
}

/**
 * Rules used when core has no treatment table yet (documents imported before spec 022): the values rmu-api-tactical
 * had before it.
 */
const DEFAULT_RULES: TreatmentRules = {
  headDifficultySteps: 1,
  cauterizePenaltyPerBleeding: -5,
  bleedingProcedures: ['pressure', 'stitches', 'tourniquet', 'cauterize'],
  tourniquetLocations: ['arm', 'leg'],
};
/** Procedures that are not Medicine maneuvers: the core table does not list them. */
const UNLISTED_PROCEDURES: TreatmentProcedure[] = ['magic', 'herbs'];
/** Direct pressure slows a bleeding that is not light by this much (same value as rmu-api-tactical). */
const PRESSURE_REDUCTION = 4;
/** Bleeding that direct pressure stops when the tables give no light threshold. */
const DEFAULT_LIGHT_BLEEDING = 3;
const DEFAULT_DIFFICULTY: Difficulty = 'm';

/** Severity of the heat critical a cauterization inflicts, by result (Table 13-1c, same as rmu-api-tactical). */
const CAUTERIZE_HEAT_CRITICAL: Record<TreatmentResult, string | undefined> = {
  'absolute-failure': 'D',
  failure: 'C',
  'partial-success': 'B',
  success: 'A',
  'absolute-success': undefined,
};

const STITCHABLE_SEVERITIES: Injury['severity'][] = ['light', 'medium'];

/** Halves a penalty rounding toward zero, without -0. */
const halve = (penalty: number): number => Math.trunc(penalty / 2) || 0;

/**
 * Treatment rules shared with rmu-api-tactical (spec 022): the difficulty from the core table, the procedures that
 * fit the injury and what each one does to it. A treatment works on a success or an absolute success; a partial
 * success only keeps its recovery roll modifier. Cauterizing follows its own table: a partial success also stops the
 * bleeding and a failure halves it.
 */
export class InjuryTreatmentRules {
  static isSuccess(result: TreatmentResult): boolean {
    return result === 'success' || result === 'absolute-success';
  }

  /** The rules of core, or the defaults while core has no treatment table. */
  static rules(tables: HealingTables): TreatmentRules {
    return tables.treatmentDifficulties?.length && tables.treatmentRules ? tables.treatmentRules : DEFAULT_RULES;
  }

  /** Stitches only on light and medium injuries; tourniquets only on limbs; never on a healed injury. */
  static validate(procedure: TreatmentProcedure, injury: Injury, tables: HealingTables): void {
    if (injury.status === 'healed') {
      throw new ValidationError(`Injury ${injury.id} is already healed`, 'err-injury-healed');
    }
    if (procedure === 'stitches' && !STITCHABLE_SEVERITIES.includes(injury.severity)) {
      throw new ValidationError('Stitches only close light and medium injuries', 'err-treatment-invalid-severity');
    }
    const locations = InjuryTreatmentRules.rules(tables).tourniquetLocations;
    if (procedure === 'tourniquet' && injury.location && !locations.includes(injury.location)) {
      throw new ValidationError('A tourniquet only goes on a limb', 'err-treatment-invalid-location');
    }
  }

  /**
   * Difficulty of the procedure on the injury from `treatmentDifficulties` of core (row of the procedure, injury type
   * and severity), harder on the head and, when cauterizing, by the bleeding. Without a table: medium.
   */
  static difficulty(procedure: TreatmentProcedure, injury: Injury, tables: HealingTables): TreatmentDifficulty {
    if (UNLISTED_PROCEDURES.includes(procedure)) {
      return { procedure, headSteps: 0, base: 0, bleedingModifier: 0, difficulty: 0, matched: false, applicable: true };
    }
    const rows = tables.treatmentDifficulties ?? [];
    const rules = InjuryTreatmentRules.rules(tables);
    const row = rows.find(r => r.procedure === procedure && r.injuryType === injury.type && r.severity === injury.severity);
    const headSteps = injury.location === 'head' ? rules.headDifficultySteps : 0;
    const start = row && isDifficulty(row.difficulty) ? row.difficulty : DEFAULT_DIFFICULTY;
    const grade = DIFFICULTIES[Math.min(DIFFICULTIES.length - 1, DIFFICULTIES.indexOf(start) + headSteps)];
    const base = DIFFICULTY_MODIFIERS[grade];
    const bleedingModifier = procedure === 'cauterize' ? rules.cauterizePenaltyPerBleeding * Math.max(0, injury.bleeding ?? 0) || 0 : 0;
    return {
      procedure,
      grade,
      headSteps,
      base,
      bleedingModifier,
      difficulty: base + bleedingModifier,
      matched: !!row,
      applicable: !!row || rows.length === 0,
    };
  }

  static heatCritical(procedure: TreatmentProcedure, result: TreatmentResult): string | undefined {
    return procedure === 'cauterize' ? CAUTERIZE_HEAT_CRITICAL[result] : undefined;
  }

  /**
   * The injury after the treatment: an absolute failure worsens the penalty and its recovery base (cauterize has its
   * own table and does not); pressure stops a light bleeding and slows the rest; stitches stop it and halve the
   * penalty and its recovery base; tourniquet and magic stop it; cauterizing stops it or halves it on a failure. The
   * severity is computed again when the penalty or the bleeding change.
   */
  static apply(injury: Injury, treatment: InjuryTreatment, penaltyWorsening: number, tables: HealingTables): Injury {
    const next: Injury = { ...injury, treatments: [...injury.treatments, treatment], updatedAt: treatment.at };
    const bleeding = Math.max(0, injury.bleeding ?? 0);
    const success = InjuryTreatmentRules.isSuccess(treatment.result);
    if (treatment.procedure === 'cauterize') {
      if (treatment.result === 'failure') InjuryTreatmentRules.setBleeding(next, Math.floor(bleeding / 2), 'cauterized');
      else if (treatment.result !== 'absolute-failure') InjuryTreatmentRules.setBleeding(next, 0, 'cauterized');
    } else {
      const worsening = Math.abs(penaltyWorsening || 0);
      if (worsening > 0) {
        next.penalty = Math.min(0, injury.penalty) - worsening;
        next.initialPenalty = Math.min(0, injury.initialPenalty) - worsening;
      }
      if (treatment.procedure === 'magic') {
        InjuryTreatmentRules.setBleeding(next, 0, 'magic');
      } else if (success) {
        InjuryTreatmentRules.applySuccess(next, treatment.procedure, bleeding, tables);
      }
    }
    if (next.penalty !== injury.penalty || next.initialPenalty !== injury.initialPenalty || next.bleeding !== injury.bleeding) {
      next.severity = new HealingCalculator(tables).severity(Math.min(next.penalty, next.initialPenalty), next.bleeding);
    }
    return next;
  }

  private static applySuccess(injury: Injury, procedure: TreatmentProcedure, bleeding: number, tables: HealingTables): void {
    switch (procedure) {
      case 'pressure': {
        const light = tables.severity.find(row => row.severity === 'light')?.maxBleeding ?? DEFAULT_LIGHT_BLEEDING;
        InjuryTreatmentRules.setBleeding(injury, bleeding <= light ? 0 : bleeding - PRESSURE_REDUCTION, 'pressure');
        break;
      }
      case 'stitches':
        InjuryTreatmentRules.setBleeding(injury, 0, 'stitches');
        injury.penalty = halve(injury.penalty);
        injury.initialPenalty = halve(injury.initialPenalty);
        break;
      case 'tourniquet':
        InjuryTreatmentRules.setBleeding(injury, 0, 'tourniquet');
        break;
      default:
        break;
    }
  }

  private static setBleeding(injury: Injury, bleeding: number, control: BleedingControl): void {
    if (!injury.bleeding || injury.bleeding <= 0) return;
    injury.bleeding = Math.max(0, bleeding);
    injury.bleedingControl = control;
  }
}
