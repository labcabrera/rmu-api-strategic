export const FACTION_MEMBERSHIP = Symbol('FactionMembershipPort');

/** Spec 071, decision 10: a user is a member of a faction when they lead it or own a character in it. */
export interface FactionMembershipPort {
  /** The factions of those games the user is a member of. */
  memberFactionIds(userId: string, gameIds: string[]): Promise<string[]>;
}
