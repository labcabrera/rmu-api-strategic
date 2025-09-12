export interface RealmResponse {
  id: string;
  name: string;
}

export interface RealmClientPort {
  getRealmById(realmId: string): Promise<RealmResponse | undefined>;
}
