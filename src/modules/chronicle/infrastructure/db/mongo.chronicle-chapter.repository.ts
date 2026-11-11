import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import type { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { MongoQueryCriteriaMapper } from '../../../shared/infrastructure/db/mongo-query-criteria.mapper.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { ChronicleChapterRepository } from '../../application/ports/chronicle-chapter-repository.port.js';
import { ChronicleChapter, type ChronicleChapterSummary } from '../../domain/aggregates/chronicle-chapter.js';
import { DEFAULT_CHRONICLE_CHAPTER_VISIBILITY } from '../../domain/value-objects/chronicle-chapter-visibility.vo.js';
import { ChronicleChapterModel, type ChronicleChapterDocument } from '../persistence/models/chronicle-chapter.model.js';

const BY_ORDER = { order: 1, createdAt: 1 } as const;

@Injectable()
export class MongoChronicleChapterRepository
  extends MongoBaseRepository<ChronicleChapter, ChronicleChapterDocument>
  implements ChronicleChapterRepository
{
  // Only updateOrder() moves a chapter: a PATCH on a copy read before a reorder does not undo it.
  protected override readonly fieldsWrittenApart = ['order'];

  constructor(@InjectModel(ChronicleChapterModel.name) model: Model<ChronicleChapterDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  async findSummaries(rsql: string | undefined, page: number, size: number, filter: QueryCriteria): Promise<Page<ChronicleChapterSummary>> {
    const parsed = this.rsqlParser.parse(rsql);
    const access = MongoQueryCriteriaMapper.toFilterQuery(filter);
    const query = (Object.keys(parsed).length === 0 ? access : { $and: [parsed, access] }) as QueryFilter<ChronicleChapterDocument>;
    const [docs, totalElements] = await Promise.all([
      this.model
        .find(query)
        .select({ content: 0 })
        .sort(BY_ORDER)
        .skip(page * size)
        .limit(size)
        .lean<ChronicleChapterModel[]>(),
      this.model.countDocuments(query),
    ]);
    return new Page(
      docs.map(doc => toSummary(doc)),
      page,
      size,
      totalElements,
    );
  }

  async findIdsByGameId(gameId: string): Promise<string[]> {
    const docs = await this.model.find({ gameId }).select({ _id: 1 }).sort(BY_ORDER).lean<{ _id: string }[]>();
    return docs.map(doc => doc._id);
  }

  countByGameId(gameId: string): Promise<number> {
    return this.model.countDocuments({ gameId });
  }

  async maxOrder(gameId: string): Promise<number> {
    const last = await this.model.findOne({ gameId }).select({ order: 1 }).sort({ order: -1 }).lean<{ order: number }>();
    return last?.order ?? -1;
  }

  async updateOrder(gameId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    // The typings of bulkWrite reject a string _id, which the schema of this collection uses.
    const operations = ids.map((id, order) => ({ updateOne: { filter: { _id: id, gameId }, update: { $set: { order } } } }));
    await this.model.bulkWrite(operations as unknown as Parameters<Model<ChronicleChapterDocument>['bulkWrite']>[0]);
  }

  async deleteByGameId(gameId: string): Promise<number> {
    const result = await this.model.deleteMany({ gameId });
    return result.deletedCount ?? 0;
  }

  protected mapToEntity(doc: ChronicleChapterDocument): ChronicleChapter {
    return ChronicleChapter.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      title: doc.title,
      content: doc.content ?? '',
      visibility: doc.visibility,
      order: doc.order,
      campaignDate: doc.campaignDate ?? undefined,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
    });
  }
}

function toSummary(doc: ChronicleChapterModel): ChronicleChapterSummary {
  return {
    id: doc._id,
    version: doc.version ?? 0,
    gameId: doc.gameId,
    title: doc.title,
    visibility: doc.visibility ?? DEFAULT_CHRONICLE_CHAPTER_VISIBILITY,
    order: doc.order,
    campaignDate: doc.campaignDate ?? undefined,
    owner: doc.owner,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    updatedBy: doc.updatedBy ?? doc.owner,
  };
}
