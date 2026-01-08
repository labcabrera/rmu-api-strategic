import { CharacterItemWeapon } from './character-item-weapon.vo';

export class CharacterItem {
  constructor(
    public id: string,
    public name: string,
    public itemTypeId: string,
    public category: string,
    public carried: boolean,
    public weapon: CharacterItemWeapon | undefined,
    public armor: CharacterItemArmor | undefined,
    public affixes: CharacterItemAffix[] | undefined,
    public info: CharacterItemInfo,
    public stackable: boolean | undefined,
    public amount: number | undefined,
    public description: string | undefined,
  ) {}
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
