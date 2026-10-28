/**
 * Deletes the factions of a deleted game (spec 044). A system command: it comes from the game.deleted event, not from
 * a request, so it has no user and does not go through the game access check.
 */
export class DeleteFactionsByGameCommand {
  constructor(public readonly gameId: string) {}
}
