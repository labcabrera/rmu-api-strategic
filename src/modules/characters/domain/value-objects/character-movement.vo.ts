export type Pace = 'creep' | 'walk' | 'jog' | 'run' | 'sprint' | 'dash';
export type BmrModifierKey = 'racial' | 'qu';

export class CharacterMovement {
  constructor(
    public baseMovementRate: number,
    public modifiers: Record<BmrModifierKey, number>,
    public maxPace: Pace = 'creep',
  ) {}

  static empty(): CharacterMovement {
    return new CharacterMovement(0, {} as Record<BmrModifierKey, number>);
  }
}
