export interface CharacterItem {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  carried: boolean;
  weapon: CharacterItemWeapon | undefined;
  weaponRange: CharacterItemWeaponRange[] | undefined;
  armor: CharacterItemArmor | undefined;
  affixes: CharacterItemAffix[] | undefined;
  info: CharacterItemInfo;
  description: string | undefined;
}

export interface CharacterItemWeapon {
  attackTable: string;
  fumbleTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
  ranges: CharacterItemWeaponRange[] | undefined;
}

export interface CharacterItemWeaponRange {
  from: number;
  to: number;
  bonus: number;
}

export interface CharacterItemWeaponRange {
  from: number;
  to: number;
  bonus: number;
}

export interface CharacterItemArmor {
  slot: string;
  at: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
  baseDifficulty: string;
}

export interface CharacterItemInfo {
  length: number | undefined;
  strength: number | undefined;
  weight: number;
}

export interface CharacterItemCost {
  min: number;
  average: number;
  max: number;
}

export interface CharacterItemAffix {
  key: string;
  value: string | undefined;
  bonus: number | undefined;
  description: string | undefined;
}
