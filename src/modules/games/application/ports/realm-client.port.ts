export interface RealmResponse {
  id: string;
  name: string;
}

export interface RealmClientPort {
  getRealmById(realmId: string): Promise<RealmResponse | undefined>;
}

export const REALM_CLIENT = Symbol('RealmClientPort');
