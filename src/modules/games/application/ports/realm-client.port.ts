export interface RealmResponse {
  id: string;
  name: string;
  /** Workspace spec 055: a generic realm (RMU Core) whose content any campaign may use. Missing in older cores. */
  generic?: boolean;
}

export interface RealmClientPort {
  getRealmById(realmId: string): Promise<RealmResponse | undefined>;
}

export const REALM_CLIENT = Symbol('RealmClientPort');
