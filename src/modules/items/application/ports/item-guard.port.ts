import type { EntityGuard } from '../../../shared/application/ports/entity-guard.port.js';
import { Item } from '../../domain/aggregates/item.js';

export type ItemGuardPort = EntityGuard<Item>;

export const ITEM_GUARD = Symbol('ItemGuardPort');
