import { Inject, Injectable, Logger } from '@nestjs/common';
import { ItemLedgerEntry, type NewItemLedgerEntry } from '../../domain/aggregates/item-ledger-entry.js';
import { type ItemLedgerRepository, ITEM_LEDGER_REPOSITORY } from '../ports/item-ledger-repository.port.js';

/**
 * Writes the ledger entry of an operation (workspace spec 023, decision 6). It is the last step: the operation has
 * already happened, so a failure here is logged and does not undo it.
 */
@Injectable()
export class ItemLedger {
  private readonly logger = new Logger(ItemLedger.name);

  constructor(@Inject(ITEM_LEDGER_REPOSITORY) private readonly repository: ItemLedgerRepository) {}

  async record(entry: NewItemLedgerEntry): Promise<ItemLedgerEntry> {
    const created = ItemLedgerEntry.create(entry);
    try {
      return await this.repository.save(created);
    } catch (e) {
      this.logger.error(`Unable to store the ledger entry ${created.id} (${entry.kind}): ${(e as Error).message}`);
      return created;
    }
  }
}
