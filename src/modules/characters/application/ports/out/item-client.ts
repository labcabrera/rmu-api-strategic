export interface ItemResponse {
  id: string;
  category: string;
  weapon: ItemWeaponResponse | undefined;
  weaponRange: ItemWeaponRangeResponse[] | undefined;
  armor: ItemArmorResponse | undefined;
  stackable: boolean | undefined;
  info: ItemInfoResponse;
}

export interface ItemWeaponResponse {
  attackTable: string;
  fumbleTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
  ranges: ItemWeaponRangeResponse[] | undefined;
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

export interface ItemClient {
  getItemById(itemId: string): Promise<ItemResponse>;
}
