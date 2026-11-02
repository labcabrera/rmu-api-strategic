import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { FactionRepository } from '../../application/ports/faction-repository.port.js';
import { FactionModel, type FactionDocument } from '../persistence/models/faction.model.js';
import { Faction } from '../../domain/aggregates/faction.js';
import { FactionManagement } from '../../domain/value-objects/faction-management.vo.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import type { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Page } from '../../../shared/application/pagination/page.js';

@Injectable()
export class MongoFactionRepository extends MongoBaseRepository<Faction, FactionDocument> implements FactionRepository {
  constructor(@InjectModel(FactionModel.name) model: Model<FactionDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  // Factions are listed by name; the filter is what the user can read
  override findByRsql(rsql: string | undefined, page: number, size: number, filter?: QueryCriteria): Promise<Page<Faction>> {
    return super.findByRsql(rsql, page, size, filter, { name: 'asc' });
  }

  async findByGameId(gameId: string): Promise<Faction[]> {
    const docs = await this.model.find({ gameId });
    return docs.map(doc => this.toEntity(doc));
  }

  protected mapToEntity(doc: FactionDocument): Faction {
    return Faction.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      name: doc.name,
      // Spec 049: only the gold; older documents may still hold the removed availableXP
      management: new FactionManagement(doc.management?.availableGold ?? 0),
      shortDescription: doc.shortDescription,
      description: doc.description,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      npcs: (doc.npcs ?? []).map(npc => ({ id: npc.id, npcId: npc.npcId, name: npc.name, count: npc.count, notes: npc.notes ?? null })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      importId: doc.importId,
    });
  }
}
