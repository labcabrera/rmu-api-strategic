export interface CharacterEquipment {
  mainHand: string | undefined;
  offHand: string | undefined;
  body: string | undefined;
  head: string | undefined;
  arms: string | undefined;
  legs: string | undefined;
  weight: number;
  enc: number;
  baseManeuverPenalty: number;
  maneuverPenalty: number;
  rangedPenalty: number;
  perceptionPenalty: number;
  movementBaseDifficulty: string | undefined;
}
