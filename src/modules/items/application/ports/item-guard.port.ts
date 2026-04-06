import { EntityGuard } from 'src/modules/shared/application/ports/entity-guard';
import { Item } from '../../domain/aggregates/item.aggregate';

export type ItemGuardPort = EntityGuard<Item>;
