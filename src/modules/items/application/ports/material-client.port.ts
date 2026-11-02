/** A superior material of rmu-api-core (GET /v1/materials/:id, workspace spec 043). */
export interface MaterialResponse {
  id: string;
  group: string;
  durability: number;
  /** null is special: no modifier */
  workability: number | null;
  bonus: number;
  bluntBonus: number | null;
  metalBonus: number | null;
  /** Gold added to the base item price, or a multiplier of it */
  cost: { add: number | null; multiplier: number | null };
  magical: boolean;
  /** Weight of an armor of this material, as a fraction */
  armorWeightMultiplier: number | null;
  uses: string[];
}

export interface MaterialClientPort {
  /** undefined when core has no such material. */
  getMaterial(id: string): Promise<MaterialResponse | undefined>;
}

export const MATERIAL_CLIENT = Symbol('MaterialClientPort');
