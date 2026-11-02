/** Time log of a campaign (workspace spec 065): one entry per step of time or correction of the calendar. */
export type GameTimeLogType = 'pass-time' | 'adjust';

/** What a character does while the time passes (decision 4). */
export const PASS_TIME_ACTIVITIES = ['full-rest', 'rest', 'excluded'] as const;
export type PassTimeActivity = (typeof PASS_TIME_ACTIVITIES)[number];
export const DEFAULT_PASS_TIME_ACTIVITY: PassTimeActivity = 'rest';

export interface GameTimeLogCharacter {
  characterId: string;
  name: string;
  activity: PassTimeActivity;
  /** The result of the rest of the character, when it was applied */
  result?: Record<string, unknown>;
  /** Why it was not applied (decision 12) */
  error?: { code: string; message: string };
}

export interface GameTimeLogEntry {
  id: string;
  gameId: string;
  type: GameTimeLogType;
  fromDay: number;
  toDay: number;
  days: number;
  hours: number;
  note?: string;
  characters: GameTimeLogCharacter[];
  userId: string;
  createdAt: string;
}
