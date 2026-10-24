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
}
