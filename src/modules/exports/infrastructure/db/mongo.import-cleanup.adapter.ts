import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type CharacterDocument, CharacterModel } from '../../../characters/infrastructure/persistence/models/character.model.js';
import { type FactionDocument, FactionModel } from '../../../factions/infrastructure/persistence/models/faction.model.js';
import { type ItemDocument, ItemModel } from '../../../items/infrastructure/persistence/models/item.model.js';
import type { ImportCleanupPort } from '../../application/ports/import-cleanup.port.js';

/** Removes what a failed import created: Mongo of compose is standalone, so there are no transactions (decision 12). */
@Injectable()
export class MongoImportCleanupAdapter implements ImportCleanupPort {
  constructor(
    @InjectModel(CharacterModel.name) private readonly characters: Model<CharacterDocument>,
    @InjectModel(ItemModel.name) private readonly items: Model<ItemDocument>,
    @InjectModel(FactionModel.name) private readonly factions: Model<FactionDocument>,
  ) {}

  async deleteByImportId(importId: string): Promise<void> {
    await Promise.all([
      this.characters.deleteMany({ importId }),
      this.items.deleteMany({ importId }),
      this.factions.deleteMany({ importId }),
    ]);
  }
}
