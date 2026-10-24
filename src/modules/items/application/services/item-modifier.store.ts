import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { CharacterProcessorService } from '../../../characters/domain/services/character-processor.service.js';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import { Item } from '../../domain/aggregates/item.js';
import { type ItemGuardPort, ITEM_GUARD } from '../ports/item-guard.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../ports/item-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Loads an item to change its modifiers and stores it with its events. The modifiers change the sheet of the
 * character that has the item (spec 019), so it is processed again.
 */
@Injectable()
export class ItemModifierStore {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async load(itemId: string, userId: string, roles: string[]): Promise<Item> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundError('Item', itemId, 'err-item-not-found');
    this.itemGuard.checkUpdate(item, userId, roles);
    return item;
  }

  async save(item: Item): Promise<Item> {
    const updated = await this.itemRepository.update(item);
    await this.events.publishChanges('item', item);
    if (item.characterId) {
      await this.reprocessCharacter(item.characterId);
    }
    return updated;
  }

  private async reprocessCharacter(characterId: string): Promise<void> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) return;
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character);
  }
}
