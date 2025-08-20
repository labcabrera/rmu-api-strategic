import { CharacterItem } from './character-item.entity';
import { CharacterXP } from './character-xp.entity';

export interface Character {
  id: string;
  gameId: string;
  factionId: string;
  name: string;
  info: CharacterInfo;
  experience: CharacterXP;
  statistics: CharacterStatistics;
  movement: CharacterMovement;
  defense: CharacterDefense;
  hp: CharacterHP;
  endurance: CharacterEndurance;
  power?: CharacterPower;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  status?: string;
  owner: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CharacterInfo {
  race: string;
  professionId: string;
  sizeId: string;
  height: number;
  weight: number;
}

export interface Stat {
  potential: number | undefined;
  temporary: number | undefined;
  bonus: number;
  racial: number;
  custom: number;
  totalBonus: number;
}

export class CharacterStatistics {
  ag: Stat;
  co: Stat;
  em: Stat;
  in: Stat;
  me: Stat;
  pr: Stat;
  qu: Stat;
  re: Stat;
  sd: Stat;
  st: Stat;
}

export interface CharacterMovement {
  baseMovementRate: number;
  strideRacialBonus: number;
  strideQuBonus: number;
  strideCustomBonus: number;
}

export interface CharacterDefense {
  armorType: number;
  defensiveBonus: number;
}

export interface CharacterHP {
  max: number;
  current: number;
}

export interface CharacterEndurance {
  customBonus: number;
  max: number;
  current: number;
  accumulator: number;
  fatiguePenalty: number;
}

export interface CharacterPower {
  max: number;
  current: number;
}

export interface CharacterInitiative {
  baseBonus: number;
  customBonus: number;
  penaltyBonus: number;
  totalBonus: number;
}

export interface CharacterSkill {
  skillId: string;
  specialization: string | undefined;
  statistics: string[];
  ranks: number;
  statBonus: number;
  racialBonus: number;
  developmentBonus: number;
  customBonus: number;
  totalBonus: number;
}

export interface CharacterEquipment {
  mainHand: string | undefined;
  offHand: string | undefined;
  body: string | undefined;
  head: string | undefined;
  weight: number | undefined;
}
