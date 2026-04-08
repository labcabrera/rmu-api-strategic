import { StatKey } from '../../domain/value-objects/character-stat.vo';

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
  stats: Record<StatKey, number>;
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
  skillBonuses: RaceSkillBonus[];
  description: string;
}

export interface RaceSkillBonus {
  skillId: string;
  specialization: string | null;
  bonus: number;
}

export interface SexBasedAttribute {
  male: number;
  female: number;
}
