import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { EnchantmentPlan } from '../../../domain/services/enchantment-planner.js';
import { EnchantmentPlanning } from '../../services/enchantment-planning.service.js';
import { QuoteEnchantmentQuery } from '../queries/enchantment.queries.js';

@QueryHandler(QuoteEnchantmentQuery)
export class QuoteEnchantmentHandler implements IQueryHandler<QuoteEnchantmentQuery, EnchantmentPlan> {
  constructor(private readonly planning: EnchantmentPlanning) {}

  async execute(query: QuoteEnchantmentQuery): Promise<EnchantmentPlan> {
    return (await this.planning.prepare(query.request, query.userId, query.roles)).plan;
  }
}
