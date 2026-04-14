import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { GameModel, GameDocument } from '../persistence/models/game-model';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { MongoBaseRepository } from 'src/modules/shared/infrastructure/db/mongo.base.repository';

@Injectable()
export class MongoGameRepository extends MongoBaseRepository<Game, GameDocument> implements GameRepository {
  constructor(@InjectModel(GameModel.name) model: Model<GameDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  async findByRealm(realmId: string): Promise<Game[]> {
    const docs = await this.model.find({ realm: realmId }).sort({ name: 1 });
    return docs.map(doc => this.mapToEntity(doc));
  }

  protected mapToEntity(doc: GameDocument): Game {
    return Game.fromProps({
      id: doc._id,
      name: doc.name,
      realmId: doc.realmId,
      realmName: doc.realmName,
      status: doc.status,
      options: doc.options,
      powerLevel: doc.powerLevel,
      description: doc.description,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      accessType: doc.accessType,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
