/**
 * Deletes the items of a deleted game. A system command: it comes from the game.deleted event (a game deleted by its
 * master, or by the cascade of a deleted realm), not from a request, so it has no user and does not go through the
 * item guard.
 */
export class DeleteItemsByGameCommand {
  constructor(public readonly gameId: string) {}
}
