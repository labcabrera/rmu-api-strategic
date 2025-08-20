export interface RealmResponse {
  id: string;
  name: string;
}

export interface RealmClient {
  getRealmById(realmId: string): Promise<RealmResponse | undefined>;
}
