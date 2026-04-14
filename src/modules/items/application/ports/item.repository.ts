import { BaseRepository } from 'src/modules/shared/application/ports/base-repository';
import { Item } from '../../domain/aggregates/item.aggregate';

export interface ItemRepository extends BaseRepository<Item> {
  findByCharacterIdAndItemTypeId(characterId: string | null, arg1: string): Promise<Item | null>;

  findByCharacterId(characterId: string): Promise<Item[]>;

  updateCarriedStatus(itemId: string, carried: boolean): Promise<Item>;
}
