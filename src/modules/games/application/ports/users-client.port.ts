export const USERS_CLIENT = Symbol('UsersClientPort');

/** The other user of an accepted friendship, with the name users knows them by. */
export interface Friend {
  userId: string;
  userName: string;
}

/** rmu-api-users, with the service token (spec 071): who are friends, and the display name of a user. */
export interface UsersClientPort {
  /** `userB` as a friend of `userA` when they have an accepted friendship (either direction); null otherwise. */
  findAcceptedFriend(userA: string, userB: string): Promise<Friend | null>;
  /** The display name of a user, or null when users has no profile for them. */
  findUserName(userId: string): Promise<string | null>;
}
