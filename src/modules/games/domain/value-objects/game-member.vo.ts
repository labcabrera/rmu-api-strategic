/** The roles of a member of a strategic game (spec 071, decision 4). The owner of the game is not a member. */
export const GAME_MEMBER_ROLES = ['master', 'player', 'spectator'] as const;
export type GameMemberRole = (typeof GAME_MEMBER_ROLES)[number];

export interface GameMember {
  userId: string;
  userName: string;
  role: GameMemberRole;
  joinedAt: Date;
}

/** A request to join a public game, until a master approves or rejects it (spec 071, decision 4). */
export interface GameJoinRequest {
  userId: string;
  userName: string;
  message: string | null;
  requestedAt: Date;
}

export const MAX_GAME_MEMBERS = 50;
export const MAX_GAME_JOIN_REQUESTS = 50;

/**
 * What a user can do with a game (spec 071), from less to more:
 * - none: nothing;
 * - cover: the card of a public game (name, descriptions, image, realm, status, power level);
 * - spectator: the game and everything of it (spec 072, decision 3), without changing anything;
 * - player: the same, and they change the factions they are a player of and what hangs from them (spec 072);
 * - master: change everything but deleting the game, its visibility and its masters;
 * - owner: everything (the owner of the game, admins and the service account).
 */
export const GAME_ACCESS_LEVELS = ['none', 'cover', 'spectator', 'player', 'master', 'owner'] as const;
export type GameAccessLevel = (typeof GAME_ACCESS_LEVELS)[number];

export function gameAccessAtLeast(level: GameAccessLevel, required: GameAccessLevel): boolean {
  return GAME_ACCESS_LEVELS.indexOf(level) >= GAME_ACCESS_LEVELS.indexOf(required);
}
