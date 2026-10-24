import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { DeleteItemCommand } from '../commands/delete-item.command';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port';
import { ItemDeletedEvent } from '../../../domain/events/item.events';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../../characters/application/ports/character-repository.port';
import { UnequipItemCommand } from '../../../../characters/application/cqrs/commands/unequip-item.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteItemCommand)
export class DeleteItemHandler implements ICommandHandler<DeleteItemCommand> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: DeleteItemCommand): Promise<void> {
    const item = await this.itemRepository.findById(command.id);
    if (!item) throw new NotFoundError('Item', command.id);

    this.itemGuard.checkDelete(item, command.userId, command.roles);

    if (item.characterId) {
      const character = await this.characterRepository.findById(item.characterId);
      if (!character) throw new NotFoundError('Character', item.characterId);
      const slots = character.equipment?.slots;
      if (Array.isArray(slots) && slots.some((slot: { id?: string } | null) => slot?.id === item.id)) {
        const unequipCommand = new UnequipItemCommand(item.characterId, item.id, command.userId, command.roles);
        await this.commandBus.execute(unequipCommand);
      }
    }
    await this.itemRepository.deleteById(command.id);
    await this.events.publish('item', new ItemDeletedEvent(item));
  }
}
