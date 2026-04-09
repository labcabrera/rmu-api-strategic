import { ItemWeapon } from '../../domain/value-objects/item-weapon.vo';

export interface ItemClientPort {
  getItemById(itemId: string): Promise<ItemResponse>;
}

export interface ItemResponse {
  id: string;
  category: string;
  weapon: ItemWeapon | null;
  armor: ItemArmorResponse | null;
  shield: ItemShieldResponse | null;
  info: ItemInfoResponse;
}

export interface ItemInfoResponse {
  cost: ItemCost | null;
  length: number | null;
  strength: number | null;
  weight: number | null;
  productionHours: number | undefined;
  stackable: boolean | undefined;
}

export interface ItemCost {
  min: number | null;
  average: number | null;
  max: number | null;
}

export interface ItemArmorResponse {
  slot: string;
  at: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
  baseDifficulty: string;
}

export interface ItemShieldResponse {
  db: number;
  blockCount: number;
}

export interface ItemWeaponRangeResponse {
  from: number;
  to: number;
  bonus: number;
}
