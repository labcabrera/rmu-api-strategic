import type { CollectionStats } from './collection-stats.js';

export interface StrategicStats {
  campaigns: CollectionStats;
  characters: CollectionStats;
  factions: CollectionStats;
}
