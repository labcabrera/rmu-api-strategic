import { randomUUID } from 'crypto';
import type { BodySide, Injury, InjuryFlag, InjurySource, InjuryType, TreatmentResult } from '../../value-objects/injury.vo.js';
import type { LostLimbLocation } from '../../value-objects/lost-limb.vo.js';

/**
 * Workspace spec 079, C1 (§13.1 Amputation). Only numbers and short paraphrases: the rule text stays in the book.
 * Surgical: a Medicine maneuver at -50 (strategic only, it takes hours). Emergency: tourniquet, cut and cauterize at -30
 * (also in combat). The stump heals as three -40 injuries (bone, muscle and skin) plus a burn when cauterized.
 */
export type AmputationMethod = 'surgical' | 'emergency';
export const AMPUTATION_METHODS: AmputationMethod[] = ['surgical', 'emergency'];

export const AMPUTATION_RULE = '§13.1';
export const AMPUTATION_DIFFICULTY: Record<AmputationMethod, number> = { surgical: -50, emergency: -30 };
export const AMPUTATION_INJURY_PENALTY = -40;
const STUMP_INJURY_TYPES: InjuryType[] = ['bone', 'muscle-tendon', 'skin-tissue'];
/** The burn of the cauterization: a cut-burn injury of the same penalty (the book gives no other value). */
const BURN_INJURY_TYPE: InjuryType = 'cut-burn';

/** A failure harms the limb more: a D Slash critical one result lower; an absolute failure is system shock (2d10 rounds). */
export const AMPUTATION_FAILURE_CRITICAL = { criticalType: 'S', criticalSeverity: 'D', resultShift: -1 } as const;
export const SYSTEM_SHOCK_DICE = 2;

const FAILURES: TreatmentResult[] = ['failure', 'absolute-failure'];

export interface AmputationConsequence {
  /** A failure: the critical the game master rolls, one result lower than the roll gives */
  critical?: { criticalType: string; criticalSeverity: string; resultShift: number };
  /** An absolute failure: system shock, death in 2d10 rounds unless treated */
  systemShock?: { dice: number };
}

export class AmputationRules {
  static difficulty(method: AmputationMethod): number {
    return AMPUTATION_DIFFICULTY[method];
  }

  /** The emergency amputation is always cauterized; a surgical one only when the healer says so. */
  static cauterized(method: AmputationMethod, cauterized: boolean | undefined): boolean {
    return method === 'emergency' ? true : !!cauterized;
  }

  /** What a failed amputation adds. The limb is lost whatever the result: a failure only harms the patient more. */
  static consequence(result: TreatmentResult): AmputationConsequence {
    if (result === 'absolute-failure') return { systemShock: { dice: SYSTEM_SHOCK_DICE } };
    if (result === 'failure') return { critical: { ...AMPUTATION_FAILURE_CRITICAL } };
    return {};
  }

  static isFailure(result: TreatmentResult): boolean {
    return FAILURES.includes(result);
  }

  /**
   * The injuries of the stump: bone, muscle and skin at -40 each, and a burn when cauterized. A non-surgical amputation
   * always leaves permanent harm unless the permanent roll is an absolute success (`permanent-risk`).
   */
  static stumpInjuries(input: {
    method: AmputationMethod;
    location: LostLimbLocation;
    side: BodySide;
    cauterized: boolean;
    severity: Injury['severity'];
    source: InjurySource;
    now: string;
  }): Injury[] {
    const types = input.cauterized ? [...STUMP_INJURY_TYPES, BURN_INJURY_TYPE] : STUMP_INJURY_TYPES;
    const flags: InjuryFlag[] = input.method === 'emergency' ? ['permanent-risk'] : [];
    return types.map(type => ({
      id: randomUUID(),
      type,
      severity: input.severity,
      location: input.location,
      side: input.side,
      penalty: AMPUTATION_INJURY_PENALTY,
      initialPenalty: AMPUTATION_INJURY_PENALTY,
      bleeding: 0,
      ...(flags.length > 0 ? { flags: [...flags] } : {}),
      description: 'amputation',
      source: { ...input.source },
      treatments: [],
      status: 'active' as const,
      createdAt: input.now,
    }));
  }
}
