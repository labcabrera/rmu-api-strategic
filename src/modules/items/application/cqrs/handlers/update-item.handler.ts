import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import { UpdateItemCommand } from '../commands/update-item.command';
import type { ItemRepository } from '../../ports/item.repository';
import type { ItemEventBusPort } from '../../ports/item-event-bus.port';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { ItemWeapon } from 'src/modules/items/domain/value-objects/item-weapon.vo';

@CommandHandler(UpdateItemCommand)
export class UpdateItemHandler implements ICommandHandler<UpdateItemCommand, Item> {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
    @Inject('ItemEventProducer') private readonly itemEventBus: ItemEventBusPort,
  ) {}

  async execute(command: UpdateItemCommand): Promise<Item> {
    const current = await this.itemRepository.findById(command.itemId);
    if (!current) throw new NotFoundError('Item', command.itemId);

    this.itemGuard.checkUpdate(current, command.userId, command.roles);

    let weapon: ItemWeapon | undefined = undefined;
    if (command.wielderSize) {
      if (!current.weapon) throw new ValidationError(`wielderSize can only be set on weapons`);
      const { skillId, fumble, modes } = current.weapon;
      weapon = new ItemWeapon(skillId, fumble, modes, command.wielderSize);
    }
    current.update({ name: command.name, weapon });
    const updated = await this.itemRepository.update(current.id, current);
    current.getUncommittedEvents().forEach(event => this.itemEventBus.publish(event));
    return updated;
  }
}
