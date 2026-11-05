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

/** Ranks a talent grants to a skill (workspace spec 076, A7: Multilingual), to undo them when it is deleted. */
export interface TraitGrantedRanks {
  skillId: string;
  specialization: string | null;
  ranks: number;
  // The skill did not exist and was created for the talent: it is removed with the talent when it keeps no ranks
  created: boolean;
}

/** How a tier of a talent was acquired (workspace spec 077, C11): the prerequisite type of the catalog it met. */
export type TraitAcquisitionType = 'natural' | 'training' | 'milestone' | 'profession' | 'skill' | 'race';
export const TRAIT_ACQUISITION_TYPES: TraitAcquisitionType[] = ['natural', 'training', 'milestone', 'profession', 'skill', 'race'];

export interface TraitAcquisition {
  tier: number;
  type: TraitAcquisitionType;
  /** The skill, profession or race it met, when the prerequisite names one */
  value?: string;
  /** Training and milestone: what the game master wrote */
  note?: string;
}

/** The talent a flaw is taken with (workspace spec 077, C11: Possible Flaws). */
export interface TraitLink {
  traitId: string;
  specialization?: string;
}

/** Workspace spec 077, C12: the trait only acts in some situations; it cost half and its sheet effects do not apply. */
export interface TraitRestriction {
  note: string;
}

/** Workspace spec 077: purchase data of a character trait, all optional. */
export interface CharacterTraitPurchase {
  acquiredBy?: TraitAcquisition[];
  linkedTo?: TraitLink;
  restricted?: TraitRestriction;
  /** A flaw whose hindrance is not checked automatically waits for the game master (C11, question 10) */
  pendingApproval?: boolean;
}

export class CharacterTrait {
  public readonly acquiredBy?: TraitAcquisition[];
  public readonly linkedTo?: TraitLink;
  public readonly restricted?: TraitRestriction;
  public readonly pendingApproval?: boolean;

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
    public readonly grantedRanks?: TraitGrantedRanks[],
    purchase: CharacterTraitPurchase = {},
  ) {
    if (purchase.acquiredBy?.length) this.acquiredBy = purchase.acquiredBy.map(entry => ({ ...entry }));
    if (purchase.linkedTo) this.linkedTo = { ...purchase.linkedTo };
    if (purchase.restricted) this.restricted = { ...purchase.restricted };
    if (purchase.pendingApproval) this.pendingApproval = true;
  }

  /** The purchase data of a trait, to copy it into a changed one (also from a plain stored object). */
  static purchaseOf(trait: CharacterTraitPurchase): CharacterTraitPurchase {
    return {
      ...(trait.acquiredBy?.length ? { acquiredBy: trait.acquiredBy } : {}),
      ...(trait.linkedTo ? { linkedTo: trait.linkedTo } : {}),
      ...(trait.restricted ? { restricted: trait.restricted } : {}),
      ...(trait.pendingApproval ? { pendingApproval: true } : {}),
    };
  }
}
