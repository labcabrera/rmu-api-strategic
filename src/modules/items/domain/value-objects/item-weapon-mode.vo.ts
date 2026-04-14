import { ItemWeaponRange } from './item-weapon-range.vo';

export class ItemWeaponMode {
  constructor(
    public readonly type: string,
    public readonly attackTypes: string[],
    public readonly attackTable: string,
    public readonly fumbleTable: string,
    public readonly sizeAdjustment: number,
    public readonly ranges: ItemWeaponRange[] | null,
  ) {}
}
