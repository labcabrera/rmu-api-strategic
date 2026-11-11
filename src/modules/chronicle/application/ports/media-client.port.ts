/** What strategic asks of rmu-api-media (workspace spec 102, decision 5). */
export interface MediaClientPort {
  /** Deletes every user image uploaded with this scope (`strategic-game:<id>`); returns how many. */
  deleteImagesByScope(scope: string): Promise<number>;
}

export const MEDIA_CLIENT = Symbol('MediaClientPort');

/** The media scope of the images of the chronicle of a game (spec 102, decision 4). */
export const chronicleImageScope = (gameId: string) => `strategic-game:${gameId}`;
