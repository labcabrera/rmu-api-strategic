import { BaseRepository } from '../../../shared/application/ports/base-repository.port';
import { Item } from '../../domain/aggregates/item';

export interface ItemRepository extends BaseRepository<Item> {
  findByCharacterIdAndItemTypeId(characterId: string | null, arg1: string): Promise<Item | null>;

  findByCharacterId(characterId: string): Promise<Item[]>;

  updateCarriedStatus(itemId: string, carried: boolean): Promise<Item>;
}

export const ITEM_REPOSITORY = Symbol('ItemRepository');
