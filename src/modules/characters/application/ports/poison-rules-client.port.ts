import type { PoisonRrRules } from '../../domain/services/healing/poison-rr.js';
import type { PoisonTables } from '../../domain/value-objects/poison.vo.js';

/** What a poisoning needs of rmu-api-core (workspace spec 042): the RR rules of the psychology tables and Table 15-6a. */
export interface PoisonRulesClientPort {
  getRrRules(): Promise<PoisonRrRules>;
  getPoisonTables(): Promise<PoisonTables>;
}

export const POISON_RULES_CLIENT = Symbol('PoisonRulesClientPort');
