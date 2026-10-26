import { ItemWeaponMode } from './item-weapon-mode.vo.js';

export const WEAPON_WIELDER_SIZES = ['small', 'medium', 'big'];

export class ItemWeapon {
  constructor(
    public readonly skillId: string,
    public readonly fumble: number,
    public readonly modes: ItemWeaponMode[],
    // Size id the weapon is made for ('small' | 'medium' | 'big'). When missing, the wielder's size is assumed.
    public readonly wielderSize?: string,
    // Tags of the weapon type in the items catalog (workspace spec 032): fencing, quarterstaff, axe...
    public readonly tags?: string[],
  ) {}

  static isTwoHanded(weapon: ItemWeapon): boolean {
    return weapon.modes.filter(m => m.type !== 'two-hands').length > 0;
  }
}
