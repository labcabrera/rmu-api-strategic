import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Page } from '../../../../shared/application/pagination/page';
import { GetItemsQuery } from '../queries/get-items.query';
import { Item } from '../../../domain/aggregates/item';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port';

@QueryHandler(GetItemsQuery)
export class GetItemsHandler implements IQueryHandler<GetItemsQuery, Page<Item>> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
  ) {}

  async execute(query: GetItemsQuery): Promise<Page<Item>> {
    const filter = this.itemGuard.buildQueryPredicate(query.userId, query.roles);
    const sort = { name: 1 };
    return await this.itemRepository.findByRsql(query.rsql, query.page, query.size, filter, sort);
  }
}
