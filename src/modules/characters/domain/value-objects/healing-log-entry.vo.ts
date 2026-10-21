export type HealingLogKind = 'tactical-outcome' | 'treatment' | 'recovery-roll' | 'permanent-roll' | 'rest' | 'manual';

export interface HealingLogEntry {
  id: string;
  at: string;
  kind: HealingLogKind;
  injuryId?: string;
  tacticalGameId?: string;
  healerName?: string;
  /** Data to render with i18n */
  summary: Record<string, unknown>;
}
