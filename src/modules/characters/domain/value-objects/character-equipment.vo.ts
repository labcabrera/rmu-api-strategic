import { Difficulty } from './difficulty.vo';

export type EquipmentSlot = 'mainHand' | 'offHand' | 'body' | 'head' | 'arms' | 'legs';

export class CharacterEquipment {
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
