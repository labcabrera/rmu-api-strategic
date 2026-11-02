import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteItemsByGameCommand } from '../commands/delete-items-by-game.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { ItemDeletedEvent } from '../../../domain/events/item.events.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Deletes the items of a deleted game through the repository, one at a time, publishing an item.deleted per item like
 * DeleteItemHandler. The characters of the game are not reprocessed: the game is gone. Idempotent: a repeated message
 * no longer finds any item.
 */
@CommandHandler(DeleteItemsByGameCommand)
export class DeleteItemsByGameHandler implements ICommandHandler<DeleteItemsByGameCommand, void> {
  private readonly logger = new Logger(DeleteItemsByGameHandler.name);

  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteItemsByGameCommand): Promise<void> {
    const items = await this.itemRepository.findByGameId(command.gameId);
    this.logger.log(`Deleting ${items.length} items of game ${command.gameId}`);
    for (const item of items) {
      await this.itemRepository.deleteById(item.id);
      await this.events.publish('item', new ItemDeletedEvent(item.getProps()));
    }
  }
}
