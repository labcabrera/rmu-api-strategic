import { ItemWeaponRange } from './item-weapon-range.vo.js';

export class ItemWeaponMode {
  constructor(
    public readonly type: string,
    public readonly attackTypes: string[],
    public readonly attackTable: string,
    public readonly fumbleTable: string,
    public readonly sizeAdjustment: number,
    public readonly ranges: ItemWeaponRange[] | null,
    /** Workspace spec 041: OB modifier of the mode, such as the penalty of an improvised weapon. */
    public readonly obModifier?: number,
  ) {}
}
