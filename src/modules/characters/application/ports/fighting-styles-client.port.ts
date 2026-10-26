import type { FightingStyleCatalog } from '../../domain/value-objects/fighting-styles.vo.js';

/** Fighting styles of rmu-api-core (GET /v1/fighting-styles). */
export interface FightingStylesClientPort {
  getFightingStyles(): Promise<FightingStyleCatalog>;
}

export const FIGHTING_STYLES_CLIENT = Symbol('FightingStylesClientPort');
