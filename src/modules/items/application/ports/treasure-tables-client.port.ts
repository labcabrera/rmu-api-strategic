import type { TreasureTables } from '../../domain/value-objects/treasure-tables.vo.js';

export interface TreasureTablesClientPort {
  /** The treasure tables of rmu-api-core (workspace spec 067); null when core has none imported. */
  getTreasureTables(): Promise<TreasureTables | null>;
}

export const TREASURE_TABLES_CLIENT = Symbol('TreasureTablesClientPort');
