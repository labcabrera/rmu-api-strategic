import { ItemWeaponMode } from './item-weapon-mode.vo';

export class ItemWeapon {
  constructor(
    public readonly skillId: string,
    public readonly fumble: number,
    public readonly modes: ItemWeaponMode[],
  ) {}

  static isTwoHanded(weapon: ItemWeapon): boolean {
    return weapon.modes.filter((m) => m.type !== 'two-hands').length > 0;
  }
}
