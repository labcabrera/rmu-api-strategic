import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Spec 072, decision 5: a master adds a player of the game; a player of the faction adds a friend of theirs. */
export class AddFactionPlayerCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly playerId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** Spec 072, decision 5: a master takes out anybody; a player of the faction only leaves it. */
export class RemoveFactionPlayerCommand extends AuthenticatedCommand {
  constructor(
    public readonly factionId: string,
    public readonly playerId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** Spec 072, decision 9: after a change of the members of a game, its factions keep only its players. */
export class SyncFactionPlayersCommand {
  constructor(
    public readonly gameId: string,
    /** The ids of the members with role `player`. */
    public readonly playerIds: string[],
  ) {}
}
