export class CharacterMovement {
  constructor(
    public baseMovementRate: number,
    public strideRacialBonus: number,
    public strideQuBonus: number,
    public strideCustomBonus: number,
  ) {}

  static empty(): CharacterMovement {
    return new CharacterMovement(0, 0, 0, 0);
  }
}
