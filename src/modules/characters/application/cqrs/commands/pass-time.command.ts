import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { PassTimeActivity } from '../../../../games/domain/value-objects/game-time-log-entry.vo.js';

/** Time passes in a campaign (workspace spec 065). */
export class PassTimeCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly days: number,
    public readonly hours: number,
    public readonly note: string | undefined,
    /** Activity per character; the ones not listed rest (decision 4) */
    public readonly characters: { characterId: string; activity: PassTimeActivity }[],
    public readonly dryRun: boolean,
    public readonly expectedVersion: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
