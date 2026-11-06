import type { InjurySource } from './injury.vo.js';

export type CharacterConditionStatus = 'unconscious' | 'permanent-unconscious' | 'dead';

export const CHARACTER_CONDITION_STATUSES: CharacterConditionStatus[] = ['unconscious', 'permanent-unconscious', 'dead'];

export interface CharacterCondition {
  id: string;
  status: CharacterConditionStatus;
  source: InjurySource;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
  /**
   * Workspace spec 079, C6 (§13.2): day of the campaign (spec 065) when it began; set on the deaths since then. It does
   * not travel in the export files (the days of another campaign mean nothing).
   */
  gameDay?: number;
}
