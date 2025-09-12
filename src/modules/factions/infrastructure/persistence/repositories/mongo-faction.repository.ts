import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { RsqlParser } from 'src/modules/shared/infrastructure/messaging/rsql-parser';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import { FactionModel, FactionDocument } from '../models/faction.model';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';

@Injectable()
export class MongoFactionRepository implements FactionRepository {
  constructor(
    @InjectModel(FactionModel.name) private factionModel: Model<FactionDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Faction | null> {
    const readed = await this.factionModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Faction>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [factionDocs, totalElements] = await Promise.all([
      this.factionModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.factionModel.countDocuments(mongoQuery),
    ]);
    const content = factionDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Faction>(content, page, size, totalElements);
  }

  async save(faction: Partial<Faction>): Promise<Faction> {
    const model = new this.factionModel({ ...faction, _id: faction.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<Faction>): Promise<Faction> {
    const updatedFaction = await this.factionModel.findByIdAndUpdate(id, { $set: request }, { new: true });
    if (!updatedFaction) {
      throw new NotFoundError('Faction', id);
    }
    return this.mapToEntity(updatedFaction);
  }

  async deleteById(id: string): Promise<Faction | null> {
    const result = await this.factionModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  private mapToEntity(doc: FactionDocument): Faction {
    return {
      id: doc._id as string,
      gameId: doc.gameId,
      name: doc.name,
      management: doc.management,
      description: doc.description,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
