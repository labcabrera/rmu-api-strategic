export interface RaceClientPort {
  getRaceById(raceId: string): Promise<RaceResponse>;
}

export interface RaceResponse {
  id: string;
  name: string;
  realm: string;
  size: string;
  defaultStatBonus: Record<string, number>;
  resistances: Record<string, number>;
  averageHeight: any;
  averageWeight: any;
  strideBonus: number | undefined;
  enduranceBonus: number | undefined;
  recoveryMultiplier: number;
  baseHits: number;
  bonusDevPoints: number;
  description: string;
}
