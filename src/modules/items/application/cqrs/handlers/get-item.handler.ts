import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetItemQuery } from '../queries/get-item.query';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import type { ItemRepository } from '../../ports/item.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@QueryHandler(GetItemQuery)
export class GetItemHandler implements IQueryHandler<GetItemQuery, Item> {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
  ) {}

  async execute(query: GetItemQuery): Promise<Item> {
    const current = await this.itemRepository.findById(query.gameId);
    if (!current) throw new NotFoundError('Item', query.gameId);
    this.itemGuard.checkRead(current, query.userId, query.roles);
    return current;
  }
}
