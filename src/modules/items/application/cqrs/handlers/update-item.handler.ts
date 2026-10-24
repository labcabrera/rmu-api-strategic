import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { UpdateItemCommand } from '../commands/update-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { Item } from '../../../domain/aggregates/item.js';
import { ItemWeapon } from '../../../domain/value-objects/item-weapon.vo.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateItemCommand)
export class UpdateItemHandler implements ICommandHandler<UpdateItemCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
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
    current.checkVersion(command.expectedVersion);
    current.update({ name: command.name, weapon });
    const updated = await this.itemRepository.update(current);
    await this.events.publishChanges('item', current);
    return updated;
  }
}
