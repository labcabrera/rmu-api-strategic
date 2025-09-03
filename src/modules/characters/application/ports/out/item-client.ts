export interface ItemResponse {
  id: string;
  category: string;
  weapon: ItemWeaponResponse | undefined;
  weaponRange: ItemWeaponRangeResponse[] | undefined;
  armor: ItemArmorResponse | undefined;
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
    value: number;
    type: string;
  };
  length: number | undefined;
  strength: number | undefined;
  weight: number | undefined;
  weightPercent: number | undefined;
  productionHours: number | undefined;
}

export interface ItemArmorResponse {
  slot: string;
  armorType: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
}

export interface ItemWeaponRangeResponse {
  from: number;
  to: number;
  bonus: number;
}

export interface ItemClient {
  getItemById(itemId: string): Promise<ItemResponse>;
}
