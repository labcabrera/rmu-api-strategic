export interface HealthSummary {
  /** Sum of the penalties of the active, recovering and permanent injuries (<= 0) */
  injuryPenalty: number;
  /** Number of active or recovering injuries */
  activeInjuries: number;
  /** Hits per round of the injuries that are not healed */
  bleeding: number;
}
