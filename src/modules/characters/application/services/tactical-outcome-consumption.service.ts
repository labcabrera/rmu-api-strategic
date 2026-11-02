import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ItemLedgerRepository, ITEM_LEDGER_REPOSITORY } from '../../../items/application/ports/item-ledger-repository.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { ItemLedger } from '../../../items/application/services/item-ledger.service.js';
import { ItemStock } from '../../../items/application/services/item-stock.service.js';
import type { Character } from '../../domain/aggregates/character.js';
import type { TacticalItemConsumed } from '../../domain/value-objects/tactical-game-outcome.vo.js';

export interface TacticalConsumptionSummary {
  itemsConsumed: { itemId: string; amount: number; removed: boolean }[];
  itemsConsumedIgnored: string[];
}

/** Id of the ledger entry of the units of an item a tactical game spent: the key of the idempotency. */
export const consumedEntryId = (tacticalGameId: string, itemId: string): string => `consumed:${tacticalGameId}:${itemId}`;

/**
 * The units of items a tactical game spent (workspace spec 068, decision 7): the stack shrinks, or the item is gone,
 * with a ledger entry of kind `consumed`. The entry has a fixed id by game and item, so a retry of the outcome spends
 * nothing twice. Items that are not of the character (or no longer exist) are ignored. The sheet of the character is
 * processed by the caller, which stores it.
 */
@Injectable()
export class TacticalOutcomeConsumption {
  private readonly logger = new Logger(TacticalOutcomeConsumption.name);

  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ITEM_LEDGER_REPOSITORY) private readonly ledgerRepository: ItemLedgerRepository,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
  ) {}

  async consume(
    character: Character,
    tacticalGameId: string,
    consumed: TacticalItemConsumed[],
    userId: string,
  ): Promise<TacticalConsumptionSummary | undefined> {
    const byItem = new Map<string, number>();
    for (const { itemId, amount } of consumed) {
      if (amount > 0) byItem.set(itemId, (byItem.get(itemId) ?? 0) + amount);
    }
    if (byItem.size === 0) return undefined;
    const summary: TacticalConsumptionSummary = { itemsConsumed: [], itemsConsumedIgnored: [] };
    for (const [itemId, amount] of byItem) {
      const entryId = consumedEntryId(tacticalGameId, itemId);
      if (await this.ledgerRepository.findById(entryId)) {
        this.logger.log(`Units of item ${itemId} spent in tactical game ${tacticalGameId} already discounted`);
        continue;
      }
      const item = await this.itemRepository.findById(itemId);
      if (!item || item.characterId !== character.id) {
        this.logger.warn(`Consumed item ${itemId} of tactical game ${tacticalGameId} is not of character ${character.id}`);
        summary.itemsConsumedIgnored.push(itemId);
        continue;
      }
      const units = Math.min(amount, item.units);
      const taken = await this.stock.take(item, units);
      await this.ledger.record({
        id: entryId,
        gameId: character.gameId,
        kind: 'consumed',
        itemId: item.id,
        itemTypeId: item.itemTypeId,
        itemName: item.name,
        amount: units,
        from: { kind: 'character', id: character.id },
        to: null,
        note: `tactical-outcome:${tacticalGameId}`,
        details: { tacticalGameId },
        userId,
      });
      summary.itemsConsumed.push({ itemId: item.id, amount: units, removed: taken.whole });
    }
    return summary.itemsConsumed.length > 0 || summary.itemsConsumedIgnored.length > 0 ? summary : undefined;
  }
}
