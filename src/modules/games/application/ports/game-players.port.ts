/**
 * The players of a strategic game: the users who own a character in it. They read the game, its factions and its
 * characters (rmu-api-tactical reads them with the token of the player who takes part in a tactical game).
 */
export interface GamePlayersPort {
  isPlayer(gameId: string, userId: string): Promise<boolean>;

  /** The ids of the games where the user owns a character. */
  gamesOf(userId: string): Promise<string[]>;
}

export const GAME_PLAYERS = Symbol('GamePlayersPort');
