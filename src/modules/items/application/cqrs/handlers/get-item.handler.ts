import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetItemQuery } from '../queries/get-item.query.js';
import { Item } from '../../../domain/aggregates/item.js';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';

@QueryHandler(GetItemQuery)
export class GetItemHandler implements IQueryHandler<GetItemQuery, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
  ) {}

  async execute(query: GetItemQuery): Promise<Item> {
    const current = await this.itemRepository.findById(query.gameId);
    if (!current) throw new NotFoundError('Item', query.gameId);
    this.itemGuard.checkRead(current, query.userId, query.roles);
    return current;
  }
}
