export interface Faction {
  id: string;
  gameId: string;
  name: string;
  management: FactionManagement;
  owner: string;
  description: string | undefined;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface FactionManagement {
  availableXP: number;
  availableGold: number;
}
