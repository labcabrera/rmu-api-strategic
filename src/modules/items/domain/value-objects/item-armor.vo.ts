import type { Difficulty } from '../../../characters/domain/value-objects/difficulty.vo.js';

export type ArmorClass = 'light' | 'medium' | 'heavy';

export class ItemArmor {
  /** Workspace spec 041: light, medium or heavy helmet, vambraces or greaves. */
  public readonly class?: ArmorClass | null;

  constructor(
    public readonly slot: string,
    public readonly at: number,
    public readonly enc: number,
    public readonly maneuverPenalty: number,
    public readonly rangedPenalty: number,
    public readonly perceptionPenalty: number,
    public readonly baseDifficulty: Difficulty,
    /** Workspace spec 041: the slots it covers, its slot among them (a full suit covers the four). */
    public readonly coverage?: string[] | null,
    armorClass?: ArmorClass | null,
  ) {
    if (armorClass) this.class = armorClass;
  }

  /** The slots the piece fills when it is equipped: its coverage, or only its slot. */
  static slotsOf(armor: Pick<ItemArmor, 'slot' | 'coverage'>): string[] {
    return armor.coverage?.length ? [...new Set([armor.slot, ...armor.coverage])] : [armor.slot];
  }
}
