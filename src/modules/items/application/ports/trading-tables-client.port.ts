import type { TradingTables } from '../../domain/value-objects/trading-tables.vo.js';

export interface TradingTablesClientPort {
  /** Null when core has no trading tables imported: the market falls back to the Trading rule of Core Law. */
  getTradingTables(): Promise<TradingTables | null>;
}

export const TRADING_TABLES_CLIENT = Symbol('TradingTablesClientPort');
