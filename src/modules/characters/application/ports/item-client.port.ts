import { CharacterItemWeapon } from '../../domain/value-objects/character-item-weapon.vo';

export interface ItemClientPort {
  getItemById(itemId: string): Promise<ItemResponse>;
}

export interface ItemResponse {
  id: string;
  category: string;
  weapon: CharacterItemWeapon | undefined;
  armor: ItemArmorResponse | undefined;
  info: ItemInfoResponse;
}

export interface ItemInfoResponse {
  cost: {
    min: number | undefined;
    average: number | undefined;
    max: number | undefined;
  };
  length: number | undefined;
  strength: number | undefined;
  weight: number | undefined;
  weightPercent: number | undefined;
  productionHours: number | undefined;
  stackable: boolean | undefined;
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

export interface ItemWeaponRangeResponse {
  from: number;
  to: number;
  bonus: number;
}
