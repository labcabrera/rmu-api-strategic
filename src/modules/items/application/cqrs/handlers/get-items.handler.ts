import type { SortCriteria } from '../../../../shared/application/criteria/query-criteria.js';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Page } from '../../../../shared/application/pagination/page.js';
import { GetItemsQuery } from '../queries/get-items.query.js';
import { Item } from '../../../domain/aggregates/item.js';
import { ItemAccess } from '../../services/item-access.service.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';

@QueryHandler(GetItemsQuery)
export class GetItemsHandler implements IQueryHandler<GetItemsQuery, Page<Item>> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly itemAccess: ItemAccess,
  ) {}

  async execute(query: GetItemsQuery): Promise<Page<Item>> {
    const filter = await this.itemAccess.readFilter(query.userId, query.roles);
    const sort: SortCriteria = { name: 'asc' };
    return await this.itemRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
