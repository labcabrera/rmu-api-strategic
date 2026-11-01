import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { QueryCriteria, SortCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { EnchantmentRepository } from '../../application/ports/enchantment-repository.port.js';
import { ACTIVE_ENCHANTMENT_STATUSES, EnchantmentProject } from '../../domain/aggregates/enchantment-project.js';
import { type EnchantmentProjectDocument, EnchantmentProjectModel } from '../persistence/models/enchantment-project.model.js';

@Injectable()
export class MongoEnchantmentProjectRepository
  extends MongoBaseRepository<EnchantmentProject, EnchantmentProjectDocument>
  implements EnchantmentRepository
{
  constructor(@InjectModel(EnchantmentProjectModel.name) model: Model<EnchantmentProjectDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  // The newest projects first
  override findByRsql(
    rsql: string | undefined,
    page: number,
    size: number,
    filter?: QueryCriteria,
    sort?: SortCriteria,
  ): Promise<Page<EnchantmentProject>> {
    return super.findByRsql(rsql, page, size, filter, sort ?? { createdAt: 'desc' });
  }

  async findActiveByItemId(itemId: string): Promise<EnchantmentProject | null> {
    const doc = await this.model.findOne({ itemId, status: { $in: ACTIVE_ENCHANTMENT_STATUSES } });
    return doc ? this.toEntity(doc) : null;
  }

  protected mapToEntity(doc: EnchantmentProjectDocument): EnchantmentProject {
    return EnchantmentProject.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      alchemistId: doc.alchemistId,
      alchemistName: doc.alchemistName,
      itemId: doc.itemId,
      itemName: doc.itemName,
      request: doc.request,
      plan: doc.plan,
      scr: (doc.scr ?? []).map(entry => ({ ...entry })),
      status: doc.status,
      daysCompleted: doc.daysCompleted ?? 0,
      extraDays: doc.extraDays ?? 0,
      extraCost: doc.extraCost ?? 0,
      notes: doc.notes ?? null,
      payer: doc.payer ?? null,
      paid: doc.paid ?? 0,
      refunded: doc.refunded ?? 0,
      ledgerEntryIds: [...(doc.ledgerEntryIds ?? [])],
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt ?? null,
      completedAt: doc.completedAt ?? null,
    });
  }
}
