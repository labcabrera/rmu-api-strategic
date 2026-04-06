import { BaseRepository } from 'src/modules/shared/application/ports/base-repository';
import { Item } from '../../domain/aggregates/item.aggregate';

export type ItemRepository = BaseRepository<Item>;
