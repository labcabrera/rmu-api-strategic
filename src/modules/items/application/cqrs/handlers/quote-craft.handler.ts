import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CraftingPlan } from '../../../domain/services/crafting-plan.js';
import { CraftingPlanning } from '../../services/crafting-planning.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { QuoteCraftQuery } from '../queries/quote-craft.query.js';

/** The workshop shows the cost, modifiers and hours of a craft before the roll (workspace spec 043, decision 3). */
@QueryHandler(QuoteCraftQuery)
export class QuoteCraftHandler implements IQueryHandler<QuoteCraftQuery, CraftingPlan> {
  constructor(
    private readonly itemFactory: ItemFactory,
    private readonly planning: CraftingPlanning,
  ) {}

  async execute(query: QuoteCraftQuery): Promise<CraftingPlan> {
    const itemType = await this.itemFactory.itemType(query.itemTypeId);
    return this.planning.plan(itemType, query.options);
  }
}
