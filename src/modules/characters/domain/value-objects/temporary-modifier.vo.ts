/**
 * Lasting modifiers of morale and fear (workspace spec 068, decision 19), shared with rmu-api-tactical: the morale
 * results that give a temporary modifier and the unusual event of a rally, kept on the leader.
 */
export type TemporaryModifierKind = 'morale' | 'fear-rr';
export type TemporaryModifierSource = 'morale-absolute-success' | 'morale-absolute-failure' | 'rally-unusual' | 'manual';

export const TEMPORARY_MODIFIER_KINDS: TemporaryModifierKind[] = ['morale', 'fear-rr'];
export const TEMPORARY_MODIFIER_SOURCES: TemporaryModifierSource[] = [
  'morale-absolute-success',
  'morale-absolute-failure',
  'rally-unusual',
  'manual',
];

/** A modifier as tactical creates it. */
export interface TemporaryModifier {
  id: string;
  kind: TemporaryModifierKind;
  value: number;
  source: TemporaryModifierSource;
  /** Days of campaign it lasts; null: until the game master removes it */
  days: number | null;
  createdAt: string;
  tacticalGameId: string | null;
}

/** A modifier on a strategic character: it expires on a day of the campaign (workspace spec 065). */
export interface CharacterTemporaryModifier extends TemporaryModifier {
  /** First day of the campaign it no longer applies; null: until removed */
  expiresGameDay: number | null;
}

/** The day a modifier of `days` received on `currentDay` stops applying. */
export const expiresGameDay = (days: number | null, currentDay: number): number | null =>
  days === null || days === undefined ? null : currentDay + Math.max(0, days);

/** Whether a modifier no longer applies on `currentDay`. */
export const isExpired = (modifier: Pick<CharacterTemporaryModifier, 'expiresGameDay'>, currentDay: number): boolean =>
  modifier.expiresGameDay !== null && modifier.expiresGameDay !== undefined && modifier.expiresGameDay <= currentDay;
