import { randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { AddItemModifierCommand, DeleteItemModifierCommand } from '../commands/item-modifier.commands';
import { ItemModifierStore } from '../../services/item-modifier.store';

@CommandHandler(AddItemModifierCommand)
export class AddItemModifierHandler implements ICommandHandler<AddItemModifierCommand, Item> {
  constructor(@Inject(ItemModifierStore) private readonly store: ItemModifierStore) {}

  async execute(command: AddItemModifierCommand): Promise<Item> {
    const item = await this.store.load(command.itemId, command.userId, command.roles);
    item.addModifiers([
      {
        id: randomUUID(),
        type: command.type,
        value: command.value,
        appliesTo: command.appliesTo,
        ...(command.broken ? { broken: true } : {}),
        ...(command.description ? { description: command.description } : {}),
        source: { kind: 'manual' },
        createdAt: new Date().toISOString(),
      },
    ]);
    return this.store.save(item);
  }
}

@CommandHandler(DeleteItemModifierCommand)
export class DeleteItemModifierHandler implements ICommandHandler<DeleteItemModifierCommand, Item> {
  constructor(@Inject(ItemModifierStore) private readonly store: ItemModifierStore) {}

  async execute(command: DeleteItemModifierCommand): Promise<Item> {
    const item = await this.store.load(command.itemId, command.userId, command.roles);
    item.removeModifier(command.modifierId);
    return this.store.save(item);
  }
}
