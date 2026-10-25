import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { type ItemDocument, ItemModel } from '../persistence/models/item.model.js';
import { Item } from '../../domain/aggregates/item.js';
import type { ItemRepository } from '../../application/ports/item-repository.port.js';
import { type ItemHolder, ItemHolders } from '../../domain/value-objects/item-holder.vo.js';

@Injectable()
export class MongoItemRepository extends MongoBaseRepository<Item, ItemDocument> implements ItemRepository {
  constructor(@InjectModel(ItemModel.name) model: Model<ItemDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  async findByCharacterId(characterId: string): Promise<Item[]> {
    const items = await this.model.find({ characterId });
    return items.map(doc => this.toEntity(doc));
  }

  async findByFactionId(factionId: string): Promise<Item[]> {
    const items = await this.model.find({ factionId });
    return items.map(doc => this.toEntity(doc));
  }

  async findStack(holder: ItemHolder, itemTypeId: string): Promise<Item | null> {
    const doc = await this.model.findOne({ ...ItemHolders.ids(holder), itemTypeId });
    return doc ? this.toEntity(doc) : null;
  }

  async findByCharacterIdAndItemTypeId(characterId: string, itemTypeId: string): Promise<Item | null> {
    const doc = await this.model.findOne({ characterId, itemTypeId });
    return doc ? this.toEntity(doc) : null;
  }

  async updateCarriedStatus(itemId: string, carried: boolean): Promise<Item> {
    // A write of its own: it moves the version, so a copy loaded before it can no longer be stored.
    const update = { $set: { carried, updatedAt: new Date() }, $inc: { version: 1 } };
    const updated = await this.model.findByIdAndUpdate(itemId, update, { returnDocument: 'after' });
    if (!updated) {
      throw new Error(`Item with id ${itemId} not found for updating carried status`);
    }
    return this.toEntity(updated);
  }

  protected mapToEntity(doc: ItemDocument): Item {
    return Item.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      factionId: doc.factionId,
      characterId: doc.characterId,
      itemTypeId: doc.itemTypeId,
      name: doc.name,
      category: doc.category,
      carried: doc.carried,
      weapon: doc.weapon,
      armor: doc.armor,
      shield: doc.shield,
      modifiers: (doc.modifiers || []).map(modifier => ({ ...modifier })),
      info: doc.info,
      amount: doc.amount,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      accessType: doc.accessType,
      owner: doc.owner,
      catalog: doc.catalog ?? null,
      value: doc.value ?? null,
      acquiredPrice: doc.acquiredPrice ?? null,
      unrepairable: doc.unrepairable ?? false,
    });
  }
}
