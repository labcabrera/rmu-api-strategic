// Health model shared with rmu-api-tactical (workspace spec 013, section 1)

import type { Pace } from './character-movement.vo.js';
import type { InjuryPoison } from './poison.vo.js';

export type InjuryType = 'bone' | 'cut-burn' | 'muscle-tendon' | 'organ' | 'poison-disease' | 'skin-tissue' | 'unknown';
export type InjurySeverity = 'light' | 'medium' | 'severe';
export type BodyLocation = 'head' | 'chest' | 'abdomen' | 'arm' | 'leg';
export type BodySide = 'left' | 'right';
export type BleedingControl = 'pressure' | 'stitches' | 'tourniquet' | 'cauterized' | 'magic';
export type InjuryFlag = 'permanent-risk' | 'limb-loss' | 'blinding' | 'paralysis';
export type InjuryStatus = 'active' | 'recovering' | 'permanent' | 'healed';
/** `poison`: the conditions a poisoning puts on the character (workspace spec 042). */
export type InjurySourceKind = 'critical' | 'fumble' | 'fatigue' | 'manual' | 'poison';
export type TreatmentProcedure =
  'pressure' | 'stitches' | 'tourniquet' | 'cauterize' | 'dress' | 'splint' | 'cast' | 'salve' | 'surgery' | 'magic' | 'herbs';
export type TreatmentResult = 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';
export type HealingType = 'none' | 'medicine' | 'medicine-absolute' | 'magic-or-herbs' | 'magic-and-herbs';
export type TreatmentContext = 'tactical' | 'strategic';

/** Workspace spec 068: what reopens a treated wound (completed pressure: exertion; stitches: a failed roll). */
export type InjuryReopenOn = 'exertion' | 'failed-roll';
/** Workspace spec 068: what holds a cast leg up, chosen when it is cast. */
export type CastSupport = 'none' | 'cane' | 'crutches';

export const INJURY_REOPEN_ON: InjuryReopenOn[] = ['exertion', 'failed-roll'];
export const CAST_SUPPORTS: CastSupport[] = ['none', 'cane', 'crutches'];
export const PACES: Pace[] = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

export const INJURY_TYPES: InjuryType[] = ['bone', 'cut-burn', 'muscle-tendon', 'organ', 'poison-disease', 'skin-tissue', 'unknown'];
export const INJURY_SEVERITIES: InjurySeverity[] = ['light', 'medium', 'severe'];
export const BODY_LOCATIONS: BodyLocation[] = ['head', 'chest', 'abdomen', 'arm', 'leg'];
export const BODY_SIDES: BodySide[] = ['left', 'right'];
export const BLEEDING_CONTROLS: BleedingControl[] = ['pressure', 'stitches', 'tourniquet', 'cauterized', 'magic'];
export const INJURY_FLAGS: InjuryFlag[] = ['permanent-risk', 'limb-loss', 'blinding', 'paralysis'];
export const INJURY_STATUSES: InjuryStatus[] = ['active', 'recovering', 'permanent', 'healed'];
export const INJURY_SOURCE_KINDS: InjurySourceKind[] = ['critical', 'fumble', 'fatigue', 'manual', 'poison'];
export const TREATMENT_PROCEDURES: TreatmentProcedure[] = [
  'pressure',
  'stitches',
  'tourniquet',
  'cauterize',
  'dress',
  'splint',
  'cast',
  'salve',
  'surgery',
  'magic',
  'herbs',
];
export const TREATMENT_RESULTS: TreatmentResult[] = ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'];
export const HEALING_TYPES: HealingType[] = ['none', 'medicine', 'medicine-absolute', 'magic-or-herbs', 'magic-and-herbs'];

/** Injury statuses that still apply their penalty. */
export const PENALTY_STATUSES: InjuryStatus[] = ['active', 'recovering', 'permanent'];

export interface InjurySource {
  kind: InjurySourceKind;
  tacticalGameId?: string;
  tacticalGameName?: string;
  actionId?: string;
  round?: number;
  attackerId?: string;
  attackerName?: string;
  /** `${table}-${severity}-${roll}`, e.g. "S-C-91" */
  criticalKey?: string;
  /** The poisoning a condition of kind `poison` comes from (workspace spec 042). */
  injuryId?: string;
}

export interface InjuryHealer {
  characterId?: string;
  actorId?: string;
  name: string;
  external?: boolean;
  bonus: number;
  /** Own penalties of a healer character (injuries), already added to the total (spec 022, D10) */
  penalty?: number;
}

/** Where the difficulty of a treatment comes from: the core table (or its default) or the game master. */
export type TreatmentDifficultySource = 'table' | 'override';

export interface InjuryTreatment {
  id: string;
  procedure: TreatmentProcedure;
  healer: InjuryHealer;
  /** Difficulty modifier applied */
  difficulty: number;
  /** Spec 022: missing in treatments before it and in the tactical ones */
  difficultySource?: TreatmentDifficultySource;
  roll: number;
  total: number;
  result: TreatmentResult;
  healingType: HealingType;
  /** Recovery roll modifier of the medical maneuver table (core) */
  recoveryModifier: number;
  at: string;
  context: TreatmentContext;
  tacticalGameId?: string;
  /** Severity of the heat critical of a cauterization, for the game master to resolve (Table 13-1c) */
  heatCritical?: string;
  /** Workspace spec 062: the herb used, and what it added to the Medicine and recovery rolls */
  herb?: TreatmentHerb;
  /** Workspace spec 068: e.g. 'completed-after-combat' for a tactical treatment the end of the game completed */
  note?: string;
  /** Workspace spec 068: what holds up a cast leg */
  castSupport?: CastSupport;
  /** Workspace spec 068: recovery modifier of a salve chosen by the game master (range of core) */
  salveModifier?: number;
  /** Workspace spec 068: d10 of hits of the heat of a cauterization (Table 13-1c of core), for the game master */
  heatHitsDice?: number;
  /** Workspace spec 068: the unmodified roll of a cauterization was its unusual event */
  unusualEvent?: boolean;
}

/**
 * Workspace spec 068: what a splinted or cast limb is limited to. Tactical copies it in the first round: the pace
 * of the movement, a useless arm and the factor of the maneuver penalty (the recovery penalty does not change).
 */
export interface InjuryLimits {
  pace?: Pace | null;
  limbUnusable?: boolean;
  maneuverPenaltyFactor?: number | null;
}

/** Workspace spec 068: rounds (of a tactical game) when a tourniquet was tightened and last loosened. */
export interface InjuryTourniquet {
  tightSince: number;
  loosenedAt: number | null;
}

/** A herb of the inventory used in a treatment (workspace spec 062): one dose is spent. */
export interface TreatmentHerb {
  itemId: string;
  itemTypeId: string;
  name: string;
  magical: boolean;
  medicineBonus: number;
  recoveryBonus: number;
}

/** Inputs of an explanation (workspace spec 052): numbers and keys, shown with their labels. */
export type RuleParams = Record<string, number | string | boolean>;

/** An entry of a roll breakdown with its group, rule reference and inputs (the contract of the tactical API). */
export interface RollModifier {
  key: string;
  value: number;
  group?: 'skill' | 'situation' | 'penalty' | 'target';
  rule?: string;
  params?: RuleParams;
}

export interface InjuryRecovery {
  roll: number;
  modifiers: number;
  /** The modifiers entry by entry, with their rules (workspace spec 052). */
  breakdown?: RollModifier[];
  /** Where the days come from: the table row and column, and each multiplier (workspace spec 052). */
  days?: RuleParams;
  total: number;
  /** Column by injury type, times severity (and head) */
  baseDays: number;
  /** Race times talents (Fast/Slow Healer) */
  multiplier: number;
  /** Rounded up, at least 1 */
  totalDays: number;
  remainingDays: number;
  startedAt: string;
  /** Treatment the roll used (none when untreated): one recovery roll per treatment (spec 022, D10) */
  treatmentId?: string;
  /** Rolled without care (no treatment or a failed one): it becomes permanent when it ends (spec 022, D3) */
  untreated?: boolean;
}

export interface InjuryPermanent {
  penalty: number;
  roll?: number;
}

export interface Injury {
  /** uuid, stable across modules */
  id: string;
  type: InjuryType;
  /** Derived from penalty/bleeding; editable */
  severity: InjurySeverity;
  location?: BodyLocation;
  /** Unmodified roll: odd left, even right */
  side?: BodySide;
  /** Current penalty, <= 0 */
  penalty: number;
  initialPenalty: number;
  /** Hits per round; 0 = stopped */
  bleeding?: number;
  bleedingControl?: BleedingControl;
  flags?: InjuryFlag[];
  /** Free text of the game master */
  description?: string;
  source: InjurySource;
  treatments: InjuryTreatment[];
  recovery?: InjuryRecovery;
  permanent?: InjuryPermanent;
  /** A poisoning (workspace spec 042): only in `poison-disease` injuries. */
  poison?: InjuryPoison;
  status: InjuryStatus;
  createdAt: string;
  updatedAt?: string;
  healedAt?: string;
  /** Day of the campaign when it was received (workspace spec 065); absent in older injuries */
  gameDay?: number;
  /** Workspace spec 068: limits of a splint or a cast; cleared when the injury heals or by the game master */
  limits?: InjuryLimits | null;
  /** Workspace spec 068: what reopens the wound in a tactical game */
  reopenOn?: InjuryReopenOn | null;
  /** Workspace spec 068: a tourniquet on the wound (tactical rounds) */
  tourniquet?: InjuryTourniquet | null;
}
