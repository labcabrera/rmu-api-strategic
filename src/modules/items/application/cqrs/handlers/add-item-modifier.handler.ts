import { randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Item } from '../../../domain/aggregates/item';
import { AddItemModifierCommand } from '../commands/add-item-modifier.command';
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
