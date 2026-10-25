import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';
import { ItemLedgerEntry } from '../../domain/aggregates/item-ledger-entry.js';

export type ItemLedgerRepository = Pick<BaseRepository<ItemLedgerEntry>, 'save' | 'findByRsql'>;

export const ITEM_LEDGER_REPOSITORY = Symbol('ItemLedgerRepository');
