import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';

export interface FactionEventBusPort {
  created(entity: Faction): Promise<void>;
  updated(entity: Faction): Promise<void>;
  deleted(entity: Faction): Promise<void>;
}
