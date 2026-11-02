import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { Biome } from '../../../../items/domain/value-objects/item-catalog-info.vo.js';

/** `POST /v1/characters/:id/herb-uses` (workspace spec 062): a dose of a healing herb of the character. */
export class UseHerbCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    /** Hits healed; missing: rolled in the range of the herb. */
    public readonly roll: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export type HerbSearchSkill = 'perception' | 'survival';
export const HERB_SEARCH_SKILLS: HerbSearchSkill[] = ['perception', 'survival'];

export interface HerbSearchRequest {
  biome: Biome;
  highAltitude: boolean;
  herbItemTypeIds: string[];
  skillId: HerbSearchSkill;
  specialization?: string;
  roll: number;
  unmodifiedRoll?: number;
  /** Skill bonus typed by hand; by default the one of the sheet. */
  bonus?: number;
  /** Complementary skills (Herbalism, Region Lore) and other modifiers, computed by the client. */
  modifiers: { key: string; value: number }[];
  previousSearches: number;
  familiar: boolean;
}

/** `POST /v1/characters/:id/herb-searches` (workspace spec 062): Treasure Law 2.3, finding herbs. */
export class SearchHerbsCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly request: HerbSearchRequest,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
