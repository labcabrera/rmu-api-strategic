import type { AlchemyTables } from '../../domain/value-objects/alchemy.vo.js';

export interface AlchemyTablesClientPort {
  /** The failure tables and power levels of rmu-api-core; null when core has none imported. */
  getAlchemyTables(): Promise<AlchemyTables | null>;
}

export const ALCHEMY_TABLES_CLIENT = Symbol('AlchemyTablesClientPort');
