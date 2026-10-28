import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';
import { Item } from '../../domain/aggregates/item.js';
import type { ItemHolder } from '../../domain/value-objects/item-holder.vo.js';

export interface ItemRepository extends BaseRepository<Item> {
  findByCharacterIdAndItemTypeId(characterId: string | null, arg1: string): Promise<Item | null>;

  findByCharacterId(characterId: string): Promise<Item[]>;

  findByFactionId(factionId: string): Promise<Item[]>;

  findByGameId(gameId: string): Promise<Item[]>;

  /** The item of a type a holder has (its stack of a stackable type). */
  findStack(holder: ItemHolder, itemTypeId: string): Promise<Item | null>;

  updateCarriedStatus(itemId: string, carried: boolean): Promise<Item>;
}

export const ITEM_REPOSITORY = Symbol('ItemRepository');
