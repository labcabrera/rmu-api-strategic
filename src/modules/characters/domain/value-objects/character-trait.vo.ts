export type CharacterTraitSource = 'character' | 'race';

// Development points used to pay a trait, by pool. Flaws store negative values: the points they granted
export interface TraitPayment {
  normal: number;
  bonus: number;
  flaw: number;
  // Part of the bonus points that counted towards the per level limit
  cappedBonus: number;
  // Character level when the points were spent
  level: number;
}

export class CharacterTrait {
  constructor(
    public readonly traitId: string,
    public readonly traitName: string,
    public readonly isTalent: boolean,
    public readonly tier: number | undefined,
    public readonly cost: number,
    public readonly specialization: string | undefined,
    public readonly source: CharacterTraitSource = 'character',
    public readonly paidWith?: TraitPayment,
    // Spec 024: imported from a file whose trait the core catalog of this installation does not have. It has no effect
    public readonly missingReference?: boolean,
  ) {}
}
