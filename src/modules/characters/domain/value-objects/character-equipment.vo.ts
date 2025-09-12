export class CharacterEquipment {
  constructor(
    public mainHand: string | undefined,
    public offHand: string | undefined,
    public body: string | undefined,
    public head: string | undefined,
    public arms: string | undefined,
    public legs: string | undefined,
    public weight: number,
    public enc: number,
    public baseManeuverPenalty: number,
    public maneuverPenalty: number,
    public rangedPenalty: number,
    public perceptionPenalty: number,
    public movementBaseDifficulty: string | undefined,
  ) {}

  static empty(): CharacterEquipment {
    return new CharacterEquipment(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      0,
      0,
      0,
      0,
      0,
      0,
      undefined,
    );
  }
}
