import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Page } from 'src/modules/shared/domain/entities/page';
import { GetItemsQuery } from '../queries/get-items.query';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import type { ItemRepository } from '../../ports/item.repository';

@QueryHandler(GetItemsQuery)
export class GetItemsHandler implements IQueryHandler<GetItemsQuery, Page<Item>> {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
  ) {}

  async execute(query: GetItemsQuery): Promise<Page<Item>> {
    const filter = this.itemGuard.buildQueryPredicate(query.userId, query.roles);
    const sort = { name: 1 };
    return await this.itemRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
