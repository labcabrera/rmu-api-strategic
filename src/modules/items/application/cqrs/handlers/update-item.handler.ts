import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { UpdateItemCommand } from '../commands/update-item.command';
import type { ItemRepository } from '../../ports/item.repository';
import type { ItemEventBusPort } from '../../ports/item-event-bus.port';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

@CommandHandler(UpdateItemCommand)
export class UpdateItemHandler implements ICommandHandler<UpdateItemCommand, Item> {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemEventProducer') private readonly itemEventBus: ItemEventBusPort,
  ) {}

  async execute(command: UpdateItemCommand): Promise<Item> {
    const current = await this.itemRepository.findById(command.gameId);
    if (!current) throw new NotFoundError('Game', command.gameId);

    current.update({
      name: command.name,
      // options: command.options,
      // powerLevel: command.powerLevel,
      // shortDescription: command.shortDescription,
      // description: command.description,
      // imageUrl: command.imageUrl,
    });
    const updated = await this.itemRepository.update(current.id, current);
    current.getUncommittedEvents().forEach((event) => this.itemEventBus.publish(event));
    return updated;
  }
}
