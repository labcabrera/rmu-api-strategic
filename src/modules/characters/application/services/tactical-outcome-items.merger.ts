import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { Item } from '../../../items/domain/aggregates/item.js';
import type { TacticalItemOutcome } from '../../domain/value-objects/tactical-game-outcome.vo.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';

export interface TacticalItemsSummary {
  itemsDamaged: string[];
  itemsBroken: string[];
  itemsIgnored: string[];
}

/**
 * Adds to the items of a character the modifiers they got in a tactical game (spec 019, decision 12), by uuid, so a
 * retry adds nothing twice. Items of someone else are ignored. Returns every item of the character, as it is now.
 */
@Injectable()
export class TacticalOutcomeItemsMerger {
  private readonly logger = new Logger(TacticalOutcomeItemsMerger.name);

  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async merge(characterId: string, outcomes: TacticalItemOutcome[]): Promise<{ items: Item[]; summary: TacticalItemsSummary | undefined }> {
    const items = await this.itemRepository.findByCharacterId(characterId);
    const withModifiers = outcomes.filter(outcome => (outcome.modifiers || []).length > 0);
    if (withModifiers.length === 0) {
      return { items, summary: undefined };
    }
    const summary: TacticalItemsSummary = { itemsDamaged: [], itemsBroken: [], itemsIgnored: [] };
    for (const outcome of withModifiers) {
      const item = items.find(each => each.id === outcome.itemId);
      if (!item) {
        this.logger.warn(`Item ${outcome.itemId} of a tactical outcome is not of character ${characterId}`);
        summary.itemsIgnored.push(outcome.itemId);
        continue;
      }
      const added = item.addModifiers(outcome.modifiers);
      if (added.length > 0) {
        await this.itemRepository.update(item);
        await this.events.publishChanges('item', item);
      }
      const condition = item.getCondition();
      if (condition.broken) summary.itemsBroken.push(item.id);
      else if (condition.breakagePenalty < 0) summary.itemsDamaged.push(item.id);
    }
    return { items, summary };
  }
}
