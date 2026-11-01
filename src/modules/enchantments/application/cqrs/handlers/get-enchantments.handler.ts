import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import type { EnchantmentProject } from '../../../domain/aggregates/enchantment-project.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../../ports/enchantment-repository.port.js';
import { EnchantmentAccess } from '../../services/enchantment-access.service.js';
import { GetEnchantmentQuery, GetEnchantmentsQuery } from '../queries/enchantment.queries.js';

@QueryHandler(GetEnchantmentQuery)
export class GetEnchantmentHandler implements IQueryHandler<GetEnchantmentQuery, EnchantmentProject> {
  constructor(private readonly access: EnchantmentAccess) {}

  async execute(query: GetEnchantmentQuery): Promise<EnchantmentProject> {
    const project = await this.access.find(query.projectId);
    await this.access.checkRead(project, query.userId, query.roles);
    return project;
  }
}

@QueryHandler(GetEnchantmentsQuery)
export class GetEnchantmentsHandler implements IQueryHandler<GetEnchantmentsQuery, Page<EnchantmentProject>> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
  ) {}

  async execute(query: GetEnchantmentsQuery): Promise<Page<EnchantmentProject>> {
    const filter = await this.access.readFilter(query.userId, query.roles);
    return this.repository.findByRsql(query.rsql, query.page, query.size, filter);
  }
}
