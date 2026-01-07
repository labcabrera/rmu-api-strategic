import { CharacterItemWeaponMode } from './character-item-weapon-mode.vo';

export class CharacterItemWeapon {
  constructor(
    public readonly skillId: string,
    public readonly fumble: number,
    public readonly modes: CharacterItemWeaponMode[],
  ) {}

  static isTwoHanded(weapon: CharacterItemWeapon): boolean {
    return weapon.modes.filter((m) => m.type !== 'two-hands').length > 0;
  }
}
