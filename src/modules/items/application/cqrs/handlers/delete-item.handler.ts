import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { DeleteItemCommand } from '../commands/delete-item.command';
import type { ItemRepository } from '../../ports/item.repository';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import type { ItemEventBusPort } from '../../ports/item-event-bus.port';
import { ItemDeletedEvent } from 'src/modules/items/domain/events/item.events';
import { UpdateCharacterCommand } from 'src/modules/characters/application/cqrs/commands/update-character.command';

@CommandHandler(DeleteItemCommand)
export class DeleteItemHandler implements ICommandHandler<DeleteItemCommand> {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
    @Inject('ItemEventProducer') private readonly itemEventBus: ItemEventBusPort,
    @Inject() private readonly commandBus: CommandBus,
  ) {}

  async execute(command: DeleteItemCommand): Promise<void> {
    const item = await this.itemRepository.findById(command.id);
    if (!item) throw new NotFoundError('Item', command.id);

    this.itemGuard.checkDelete(item, command.userId, command.roles);

    //TODO use event
    if (item.characterId) {
      const updateCharacterCommand = new UpdateCharacterCommand(
        item.characterId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        command.userId,
        command.roles,
      );
      await this.commandBus.execute(updateCharacterCommand);
    }

    await this.itemRepository.deleteById(command.id);
    this.itemEventBus.publish(new ItemDeletedEvent(item));
  }
}
