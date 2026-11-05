import type { Pace } from './character-movement.vo.js';
import type { BodySide } from './injury.vo.js';

/**
 * Workspace spec 079, C1 (§13.1 Amputation): a limb the character lost for good. A lost arm is a useless limb and a lost
 * leg limits the pace (tactical reads both). It travels to the tactical actor rounds and comes back with the outcome.
 */
export type LostLimbLocation = 'arm' | 'leg';
export const LOST_LIMB_LOCATIONS: LostLimbLocation[] = ['arm', 'leg'];

/** How the limb was lost: an amputation (strategic or tactical) or a confirmed limb-loss alert of a tactical game. */
export type LostLimbCause = 'amputation' | 'limb-loss';
export const LOST_LIMB_CAUSES: LostLimbCause[] = ['amputation', 'limb-loss'];

export interface LostLimb {
  location: LostLimbLocation;
  side: BodySide;
  /** ISO date when it was lost */
  at: string;
  cause?: LostLimbCause;
  /** Day of the campaign (workspace spec 065); missing when it is not known */
  gameDay?: number;
  tacticalGameId?: string;
  /** The injury that cost the limb (a tourniquet left too long, a critical) */
  injuryId?: string;
}

/** §13.1: a lost leg leaves the character crawling (or walking with a crutch, which the game master rules). */
export const LOST_LEG_MAX_PACE: Pace = 'creep';

export const sameLimb = (a: Pick<LostLimb, 'location' | 'side'>, b: Pick<LostLimb, 'location' | 'side'>): boolean =>
  a.location === b.location && a.side === b.side;

/** The lost limbs of `incoming` that `current` does not have yet. */
export const newLostLimbs = (current: LostLimb[], incoming: LostLimb[]): LostLimb[] =>
  incoming.filter((limb, index) => !current.some(each => sameLimb(each, limb)) && incoming.findIndex(o => sameLimb(o, limb)) === index);
