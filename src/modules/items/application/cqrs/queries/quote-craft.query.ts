import type { CraftingPlanOptions } from '../../services/crafting-planning.service.js';

/** Plan of a craft without rolling or paying (workspace spec 043, decision 3). */
export class QuoteCraftQuery {
  constructor(
    public readonly itemTypeId: string,
    public readonly options: CraftingPlanOptions,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
