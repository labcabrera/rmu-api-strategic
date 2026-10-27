import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { PoisonRrModifier } from '../../../domain/services/healing/poison-rr.js';
import type { AntidoteSource, PoisonData } from '../../../domain/value-objects/poison.vo.js';

/**
 * `POST /v1/characters/:id/poisonings` (workspace spec 042, decision 9): exposure and poison RR in one step. The
 * poison comes from an item of the catalog copied by the client, or is described by the game master.
 */
export class PoisonCharacterCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly poison: PoisonData,
    /** Missing: the server rolls it. */
    public readonly roll: number | undefined,
    public readonly modifiers: PoisonRrModifier[],
    /** Missing: the poison RR bonus of the sheet. */
    public readonly bonus: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/**
 * `POST /v1/characters/:id/injuries/:injuryId/antidote` (decision 10). An `item` antidote is an item of a character of
 * the game that spends one dose; the others say what they are.
 */
export class GiveAntidoteCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly antidote: {
      source: AntidoteSource;
      itemId?: string;
      name?: string;
      itemTypeId?: string;
      categories?: string[];
      level?: number;
      withinHours?: number | null;
    },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
