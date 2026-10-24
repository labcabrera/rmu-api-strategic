import { Inject, Injectable } from '@nestjs/common';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import { CharacterProcessorService } from 'src/modules/characters/domain/services/character-processor.service';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { Item } from '../../domain/aggregates/item.aggregate';
import type { ItemEventBusPort } from '../ports/item-event-bus.port';
import type { ItemGuardPort } from '../ports/item-guard.port';
import type { ItemRepository } from '../ports/item.repository';

/**
 * Loads an item to change its modifiers and stores it with its events. The modifiers change the sheet of the
 * character that has the item (spec 019), so it is processed again.
 */
@Injectable()
export class ItemModifierStore {
  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
    @Inject('ItemEventProducer') private readonly itemEventBus: ItemEventBusPort,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject(CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async load(itemId: string, userId: string, roles: string[]): Promise<Item> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundError('Item', itemId, 'err-item-not-found');
    this.itemGuard.checkUpdate(item, userId, roles);
    return item;
  }

  async save(item: Item): Promise<Item> {
    const updated = await this.itemRepository.update(item.id, item);
    item.getUncommittedEvents().forEach(event => this.itemEventBus.publish(event));
    item.uncommit();
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
    await this.characterRepository.update(character.id, character);
  }
}
