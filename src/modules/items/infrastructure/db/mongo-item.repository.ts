import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { MongoBaseRepository } from 'src/modules/shared/infrastructure/db/mongo.base.repository';
import { ItemDocument, ItemModel } from '../persistence/models/item.model';
import { Item } from '../../domain/aggregates/item.aggregate';
import { ItemRepository } from '../../application/ports/item.repository';

@Injectable()
export class MongoItemRepository extends MongoBaseRepository<Item, ItemDocument> implements ItemRepository {
  constructor(@InjectModel(ItemModel.name) model: Model<ItemDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  async findByCharacterId(characterId: string): Promise<Item[]> {
    const items = await this.model.find({ characterId });
    return items.map((doc) => this.mapToEntity(doc));
  }

  async updateCarriedStatus(itemId: string, carried: boolean): Promise<Item> {
    const update = { carried, updatedAt: new Date() };
    const updated = await this.model.findByIdAndUpdate(itemId, update, { new: true });
    if (!updated) {
      throw new Error(`Item with id ${itemId} not found for updating carried status`);
    }
    return this.mapToEntity(updated);
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
      affixes: doc.affixes,
      info: doc.info,
      stackable: doc.stackable,
      amount: doc.amount,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      accessType: doc.accessType,
      owner: doc.owner,
    });
  }
}
