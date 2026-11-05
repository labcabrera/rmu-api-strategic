/** `herb`: a dose of a healing herb (workspace spec 062). `amputation` (workspace spec 079, C1). */
export type HealingLogKind =
  'tactical-outcome' | 'treatment' | 'recovery-roll' | 'permanent-roll' | 'rest' | 'manual' | 'herb' | 'amputation' | 'strenuous-failure';

export interface HealingLogEntry {
  id: string;
  at: string;
  kind: HealingLogKind;
  injuryId?: string;
  tacticalGameId?: string;
  healerName?: string;
  /** Day of the campaign when it happened (workspace spec 065); absent in older entries */
  gameDay?: number;
  /** Data to render with i18n */
  summary: Record<string, unknown>;
}
