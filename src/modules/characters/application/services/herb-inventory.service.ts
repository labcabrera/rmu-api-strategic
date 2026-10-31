import { Injectable } from '@nestjs/common';
import { InventorySync } from '../../../items/application/services/inventory-sync.service.js';
import { ItemLedger } from '../../../items/application/services/item-ledger.service.js';
import { ItemStock } from '../../../items/application/services/item-stock.service.js';
import type { Item } from '../../../items/domain/aggregates/item.js';
import type { ItemHerb } from '../../../items/domain/value-objects/item-catalog-info.vo.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Character } from '../../domain/aggregates/character.js';
import { CharacterHealthStore } from './character-health.store.js';

/** A herb item of a character with its catalog block. */
export interface HeldHerb {
  item: Item;
  herb: ItemHerb;
  /** The character that holds it. */
  holder: Character;
}

/**
 * Herbs of the inventory used in play (workspace spec 062), as the antidotes of spec 042: a `herb` item held by a
 * character, read from its catalog block, of which one dose is spent and written to the ledger.
 */
@Injectable()
export class HerbInventory {
  constructor(
    private readonly store: CharacterHealthStore,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  /**
   * A herb of `character` or, with `sameGame`, of any character of its game (a healer carrying it).
   */
  async load(itemId: string, character: Character, options: { sameGame?: boolean } = {}): Promise<HeldHerb> {
    const item = await this.stock.load(itemId);
    const herb = item.catalog?.features?.herb;
    if (item.category !== 'herb' || !herb) throw new ValidationError(`Item ${item.id} is not a herb`, 'err-item-not-herb');
    if (!item.characterId) throw new ValidationError('The herb must be held by a character', 'err-herb-not-held');
    if (item.characterId === character.id) return { item, herb, holder: character };
    if (!options.sameGame) throw new ValidationError(`The herb is not held by ${character.name}`, 'err-herb-not-held');
    const holder = await this.store.findCharacter(item.characterId);
    if (!holder) throw new NotFoundError('Character', item.characterId, 'err-character-not-found');
    if (holder.gameId !== character.gameId) {
      throw new ValidationError('The herb must be of a character of the same game', 'err-herb-not-held');
    }
    return { item, herb, holder };
  }

  /** Spends one dose: the stack shrinks, or the item is gone. Returns the item as it is now (null when gone). */
  async spendDose(held: HeldHerb, note: string, userId: string): Promise<Item | null> {
    const { item, holder } = held;
    const taken = await this.stock.take(item, 1);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'discard',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: 1,
      from: { kind: 'character', id: holder.id },
      to: null,
      note,
      userId,
    });
    await this.inventorySync.refresh({ kind: 'character', id: holder.id });
    return taken.whole ? null : taken.item;
  }
}
