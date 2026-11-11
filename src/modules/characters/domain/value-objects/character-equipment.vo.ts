import type { Difficulty } from './difficulty.vo.js';

export type EquipmentSlot = 'mainHand' | 'offHand' | 'body' | 'head' | 'arms' | 'legs';

/**
 * Workspace spec 077, decision B1.5: the load of the character in lb: what it wears (the equipped items, worn armor
 * scaled to the body it was made for), what it carries besides, and the total as a percent of its body weight.
 */
export interface CharacterLoad {
  worn: number;
  carried: number;
  percent: number;
}

export class CharacterEquipment {
  /**
   * Workspace spec 077, decision B1.2: sum of the Enc % of the worn armor pieces that still protect (Spell Law table
   * 4-2). `encumbrancePenalty` is only the load penalty.
   */
  public armorEncumbrance?: number;
  /** Workspace spec 077, decision B1.5; missing in documents not processed since. */
  public load?: CharacterLoad;
  /**
   * Workspace spec 079, D2: the load penalty without Beast of Burden, which the dodge takes (§9.6). Missing in documents
   * not processed since: `encumbrancePenalty`.
   */
  public dodgeEncumbrancePenalty?: number;

  constructor(
    public slots: Record<EquipmentSlot, string | null>,
    public weight: number,
    public weightAllowance: number,
    public weightPercent: number,
    public encumbrancePenalty: number,
    public baseManeuverPenalty: number,
    public maneuverPenalty: number,
    public rangedPenalty: number,
    public perceptionPenalty: number,
    public movementBaseDifficulty: Difficulty,
  ) {}

  static empty(): CharacterEquipment {
    return new CharacterEquipment({} as Record<EquipmentSlot, string | null>, 0, 0, 0, 0, 0, 0, 0, 0, 'e');
  }
}
