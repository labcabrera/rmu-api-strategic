export interface CharacterItem {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  weapon: CharacterItemWeapon | undefined;
  weaponRange: CharacterItemWeaponRange[] | undefined;
  armor: CharacterItemArmor | undefined;
  info: CharacterItemInfo;
}

export interface CharacterItemWeapon {
  attackTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
}

export interface CharacterItemWeaponRange {
  from: number;
  to: number;
  bonus: number;
}

export interface CharacterItemArmor {
  slot: string;
  armorType: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
}

export interface CharacterItemInfo {
  length: number;
  strength: number;
  weight: number;
  productionTime: number;
}
