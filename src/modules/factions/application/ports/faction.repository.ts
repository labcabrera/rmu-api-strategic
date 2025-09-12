import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { Page } from 'src/modules/shared/domain/entities/page.entity';

export interface FactionRepository {
  findById(id: string): Promise<Faction | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Faction>>;

  save(faction: Faction): Promise<Faction>;

  update(factionId: string, faction: Partial<Faction>): Promise<Faction>;

  deleteById(id: string): Promise<Faction | null>;
}
