export interface TraitClientPort {
  getTraitById(traitId: string): Promise<TraitResponse>;
}

export interface TraitResponse {
  id: string;
  name: string;
  category: string;
  isTalent: boolean;
  requiresSpecialization: boolean;
  isTierBased: boolean;
  maxTier: number | null;
  adquisitionCost: number | null;
  tierCost: number | null;
  description: string;
}
