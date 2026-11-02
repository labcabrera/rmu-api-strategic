import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import type { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { ItemLedgerEntry } from '../../domain/aggregates/item-ledger-entry.js';
import type { ItemLedgerRepository } from '../../application/ports/item-ledger-repository.port.js';
import { type ItemLedgerEntryDocument, ItemLedgerEntryModel } from '../persistence/models/item-ledger-entry.model.js';

@Injectable()
export class MongoItemLedgerRepository
  extends MongoBaseRepository<ItemLedgerEntry, ItemLedgerEntryDocument>
  implements ItemLedgerRepository
{
  constructor(@InjectModel(ItemLedgerEntryModel.name) model: Model<ItemLedgerEntryDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  // The newest operations first
  override findByRsql(rsql: string | undefined, page: number, size: number, filter?: QueryCriteria): Promise<Page<ItemLedgerEntry>> {
    return super.findByRsql(rsql, page, size, filter, { createdAt: 'desc' });
  }

  protected mapToEntity(doc: ItemLedgerEntryDocument): ItemLedgerEntry {
    return ItemLedgerEntry.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      kind: doc.kind,
      itemId: doc.itemId ?? null,
      itemIds: doc.itemIds ?? (doc.itemId ? [doc.itemId] : []),
      itemTypeId: doc.itemTypeId ?? null,
      itemName: doc.itemName ?? null,
      amount: doc.amount ?? null,
      from: doc.from ?? null,
      to: doc.to ?? null,
      holderIds: doc.holderIds ?? [],
      payments: doc.payments ?? [],
      price: doc.price ?? null,
      maneuver: doc.maneuver ?? null,
      actorId: doc.actorId ?? null,
      outcome: doc.outcome ?? null,
      note: doc.note ?? null,
      ...(doc.details ? { details: doc.details } : {}),
      userId: doc.userId,
      createdAt: doc.createdAt,
    });
  }
}
