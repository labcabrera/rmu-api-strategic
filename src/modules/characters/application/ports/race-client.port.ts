export interface RaceClientPort {
  getRaceById(raceId: string): Promise<Race>;
}

export interface Race {
  id: string;
  name: string;
  realmId: string;
  realmName: string;
  archetype: string;
  sizeId: string;
  stats: Map<string, number>;
  resistances: Map<string, number>;
  averageHeight: SexBasedAttribute;
  averageWeight: SexBasedAttribute;
  strideBonus: number;
  enduranceBonus: number;
  recoveryMultiplier: number;
  baseHits: number;
  baseDevPoints: number;
  baseAt: number;
  talents: string[];
  description: string;
}

export interface SexBasedAttribute {
  male: number;
  female: number;
}
