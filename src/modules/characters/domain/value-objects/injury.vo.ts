// Health model shared with rmu-api-tactical (workspace spec 013, section 1)

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
}

export interface InjuryRecovery {
  roll: number;
  modifiers: number;
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
}
