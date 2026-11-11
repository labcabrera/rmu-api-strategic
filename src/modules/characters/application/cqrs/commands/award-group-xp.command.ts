import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Kinds of event an award of experience is for (Core Law §12.4); informative. */
export const XP_EVENT_TYPES = ['personal', 'session', 'story', 'other'] as const;
export type XpEventType = (typeof XP_EVENT_TYPES)[number];

/**
 * Experience for the group (workspace spec 079, E, §12.4): every chosen character of the game gets the whole amount,
 * not a share. Without characters, every live character of the game.
 */
export class AwardGroupXpCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly xp: number,
    public readonly characterIds: string[] | undefined,
    public readonly eventType: XpEventType | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
