import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { DeleteItemCommand } from '../commands/delete-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { ItemAccess } from '../../services/item-access.service.js';
import { ItemDeletedEvent } from '../../../domain/events/item.events.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../../characters/application/ports/character-repository.port.js';
import { CharacterProcessorService } from '../../../../characters/domain/services/character-processor.service.js';
import { CharacterUpdatedEvent } from '../../../../characters/domain/events/character.events.js';
import { Item } from '../../../domain/aggregates/item.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeleteItemCommand)
export class DeleteItemHandler implements ICommandHandler<DeleteItemCommand> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly itemAccess: ItemAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: DeleteItemCommand): Promise<void> {
    const item = await this.itemRepository.findById(command.id);
    if (!item) throw new NotFoundError('Item', command.id);

    await this.itemAccess.checkChange(item, command.userId, command.roles);

    await this.itemRepository.deleteById(command.id);
    await this.events.publish('item', new ItemDeletedEvent(item));
    if (item.characterId) await this.unequip(item);
  }

  /**
   * The character of a deleted item no longer has it: an equipped item leaves its slot (F-strategic-04) and the sheet
   * is processed again without it. A character that no longer exists (its items are deleted on character.deleted,
   * F-strategic-22) has nothing to update.
   */
  private async unequip(item: Item): Promise<void> {
    const character = await this.characterRepository.findById(item.characterId!);
    if (!character) return;
    const slots = character.equipment?.slots ?? {};
    if (Object.values(slots).includes(item.id)) character.unequipItem(item.id);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    if (!character.hasChanges()) return;
    const updated = await this.characterRepository.update(character);
    await this.events.publish('character', new CharacterUpdatedEvent(updated.getProps()));
  }
}
