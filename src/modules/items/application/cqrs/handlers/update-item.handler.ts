import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { UpdateItemCommand } from '../commands/update-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { ItemAccess } from '../../services/item-access.service.js';
import { Item } from '../../../domain/aggregates/item.js';
import { ItemWeapon } from '../../../domain/value-objects/item-weapon.vo.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateItemCommand)
export class UpdateItemHandler implements ICommandHandler<UpdateItemCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly itemAccess: ItemAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: UpdateItemCommand): Promise<Item> {
    const current = await this.itemRepository.findById(command.itemId);
    if (!current) throw new NotFoundError('Item', command.itemId);

    await this.itemAccess.checkChange(current, command.userId, command.roles);

    let weapon: ItemWeapon | undefined = undefined;
    if (command.wielderSize) {
      if (!current.weapon) throw new ValidationError(`wielderSize can only be set on weapons`);
      const { skillId, fumble, modes, tags } = current.weapon;
      weapon = new ItemWeapon(skillId, fumble, modes, command.wielderSize, tags);
    }
    current.checkVersion(command.expectedVersion);
    current.update({ name: command.name, weapon });
    // Spec 021, decision 9: a PATCH without changes neither writes nor publishes.
    if (!current.hasChanges()) return current;
    const updated = await this.itemRepository.update(current);
    await this.events.publishChanges('item', current);
    return updated;
  }
}
