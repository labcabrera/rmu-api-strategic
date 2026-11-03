export interface RealmResponse {
  id: string;
  name: string;
  /** Workspace spec 055: a generic realm (RMU Core) whose content any campaign may use. Missing in older cores. */
  generic?: boolean;
}

/** The access of a user to a realm in core (spec 069), as core answers it to other APIs (spec 071). */
export type RealmAccessLevel = 'none' | 'read' | 'write' | 'manage';

export interface RealmClientPort {
  getRealmById(realmId: string): Promise<RealmResponse | undefined>;
  /** The access of a user to the realm as a non-admin, or undefined when the realm does not exist (spec 071). */
  getUserAccess(realmId: string, userId: string): Promise<RealmAccessLevel | undefined>;
}

export const REALM_CLIENT = Symbol('RealmClientPort');
