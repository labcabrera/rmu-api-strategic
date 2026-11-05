import type { Difficulty } from '../../../characters/domain/value-objects/difficulty.vo.js';

export type ArmorClass = 'light' | 'medium' | 'heavy';

/** Body weight (lb) the catalog armor weights are given for: a 185 lb human (§5.4, table 6-4). */
export const DEFAULT_FITTED_WEIGHT = 185;

export class ItemArmor {
  /** Workspace spec 041: light, medium or heavy helmet, vambraces or greaves. */
  public readonly class?: ArmorClass | null;
  /**
   * Workspace spec 077, decision B1.3: body weight (lb) the piece was made for, the weight of the character it was
   * made for or 185. Worn by someone else it weighs `weight × wearer weight / fittedWeight` in the load.
   */
  public readonly fittedWeight?: number | null;

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

  /** The body weight the piece was made for: its fittedWeight, or 185 for pieces made before workspace spec 077. */
  static fittedWeightOf(armor: Pick<ItemArmor, 'fittedWeight'>): number {
    return armor.fittedWeight && armor.fittedWeight > 0 ? armor.fittedWeight : DEFAULT_FITTED_WEIGHT;
  }

  /** The slots the piece fills when it is equipped: its coverage, or only its slot. */
  static slotsOf(armor: Pick<ItemArmor, 'slot' | 'coverage'>): string[] {
    return armor.coverage?.length ? [...new Set([armor.slot, ...armor.coverage])] : [armor.slot];
  }
}
