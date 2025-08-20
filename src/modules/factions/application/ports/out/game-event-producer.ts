import { Faction } from 'src/modules/factions/domain/entities/faction.entity';

export interface FactionEventProducer {
  created(entity: Faction): Promise<void>;
  updated(entity: Faction): Promise<void>;
  deleted(entity: Faction): Promise<void>;
}
