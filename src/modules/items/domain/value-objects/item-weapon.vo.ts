import { ItemWeaponMode } from './item-weapon-mode.vo.js';

import { ITEM_SIZES } from '../services/item-unit-value.js';

// The same sizes as an item instance, which a weapon's size mirrors (workspace specs 062 and 075)
export const WEAPON_WIELDER_SIZES: string[] = [...ITEM_SIZES];

export class ItemWeapon {
  constructor(
    public readonly skillId: string,
    public readonly fumble: number,
    public readonly modes: ItemWeaponMode[],
    // Size id the weapon is made for (WEAPON_WIELDER_SIZES). When missing, the wielder's size is assumed.
    public readonly wielderSize?: string,
    // Tags of the weapon type in the items catalog (workspace spec 032): fencing, quarterstaff, axe...
    public readonly tags?: string[],
  ) {}

  static isTwoHanded(weapon: ItemWeapon): boolean {
    return weapon.modes.filter(m => m.type !== 'two-hands').length > 0;
  }
}
