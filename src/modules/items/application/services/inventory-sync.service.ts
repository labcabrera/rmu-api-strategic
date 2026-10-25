import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { CharacterUpdatedEvent } from '../../../characters/domain/events/character.events.js';
import { CharacterProcessorService } from '../../../characters/domain/services/character-processor.service.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import type { ItemHolder } from '../../domain/value-objects/item-holder.vo.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../ports/item-repository.port.js';

/**
 * Processes again the sheet of the characters whose items changed: weight, slots of items they no longer have,
 * attacks and defenses with the new modifiers. Without changes nothing is written (spec 021, decision 9).
 */
@Injectable()
export class InventorySync {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async refresh(...holders: (ItemHolder | null | undefined)[]): Promise<void> {
    const characterIds = [...new Set(holders.filter(holder => holder?.kind === 'character').map(holder => holder!.id))];
    for (const characterId of characterIds) {
      await this.refreshCharacter(characterId);
    }
  }

  async refreshCharacter(characterId: string): Promise<void> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) return;
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    if (!character.hasChanges()) return;
    const updated = await this.characterRepository.update(character);
    character.uncommit();
    await this.events.publish('character', new CharacterUpdatedEvent(updated.getProps()));
  }
}
