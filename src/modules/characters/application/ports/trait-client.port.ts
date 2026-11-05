export interface TraitClientPort {
  getTraitById(traitId: string): Promise<TraitResponse>;
}

export const TRAIT_CLIENT = Symbol('TraitClientPort');

export interface TraitResponse {
  id: string;
  name: string;
  category: string;
  isTalent: boolean;
  specialization: string | null;
  isTierBased: boolean;
  maxTier: number | null;
  adquisitionCost: number | null;
  tierCost: number | null;
  description: string;
  /** Character Companion 5.0: one of these per tier (workspace spec 077, C11); missing in older catalogs */
  prerequisites?: TraitPrerequisiteResponse[];
  /** Ids of the flaws that may be taken with the talent */
  possibleFlaws?: string[];
}

export interface TraitPrerequisiteResponse {
  type: 'natural' | 'training' | 'milestone' | 'profession' | 'skill' | 'race';
  /** Professions or races (comma separated) or a skill (`skillId` or `skillId@specialization`) */
  value?: string;
  description?: string;
}
