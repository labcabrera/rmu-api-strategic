import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Item } from '../../../domain/aggregates/item.js';
import { DeleteItemModifierCommand } from '../commands/delete-item-modifier.command.js';
import { ItemModifierStore } from '../../services/item-modifier.store.js';

@CommandHandler(DeleteItemModifierCommand)
export class DeleteItemModifierHandler implements ICommandHandler<DeleteItemModifierCommand, Item> {
  constructor(@Inject(ItemModifierStore) private readonly store: ItemModifierStore) {}

  async execute(command: DeleteItemModifierCommand): Promise<Item> {
    const item = await this.store.load(command.itemId, command.userId, command.roles);
    item.removeModifier(command.modifierId);
    return this.store.save(item);
  }
}
