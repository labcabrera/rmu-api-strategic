/**
 * Deletes the characters of a deleted game (spec 044). A system command: it comes from the game.deleted event (a game
 * deleted by its master, or by the cascade of a deleted realm), not from a request, so it has no user and does not go
 * through the character access check.
 */
export class DeleteCharactersByGameCommand {
  constructor(public readonly gameId: string) {}
}
