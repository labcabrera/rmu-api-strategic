import { EntityGuard } from '../../../shared/application/ports/entity-guard.port';
import { Item } from '../../domain/aggregates/item';

export type ItemGuardPort = EntityGuard<Item>;

export const ITEM_GUARD = Symbol('ItemGuardPort');
