import { HealingTables } from '../../domain/value-objects/healing-tables.vo';

/** Healing tables of rmu-api-core (GET /v1/healing-tables). */
export interface HealingTablesClientPort {
  getHealingTables(): Promise<HealingTables>;
}

export const HEALING_TABLES_CLIENT = Symbol('HealingTablesClientPort');
