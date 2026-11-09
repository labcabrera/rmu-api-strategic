import type { PowerLevel } from '../../../../enchantments/domain/value-objects/alchemy.vo.js';
import type { ItemHolder } from '../../../../items/domain/value-objects/item-holder.vo.js';
import type { TreasureQuality } from '../../../../items/domain/value-objects/treasure-tables.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { TreasureLine } from '../../../domain/services/treasure-generator.js';

/** `TreasureRollRequest` of workspace spec 067: the codes of the book and/or the qualities chosen by hand. */
export interface TreasureRollRequest {
  codes?: string | null;
  wealth?: TreasureQuality[];
  lifestyle?: TreasureQuality[];
  magic?: TreasureQuality[];
  wealthModifier?: number;
  gameId?: string | null;
  /** Adds the 7-1c modifier `power-<level>` of the tables when they have it. */
  powerLevel?: PowerLevel | null;
  /** The dice rolled by the client so far, in order (workspace spec 094). */
  dice?: number[];
}

/** `POST /v1/treasure/rolls`: rolls a treasure, stores nothing. */
export class RollTreasureQuery {
  constructor(
    public readonly request: TreasureRollRequest,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `POST /v1/treasure/awards`: the chosen lines go to a holder, all or none. */
export class AwardTreasureCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly holder: ItemHolder,
    public readonly lines: TreasureLine[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
