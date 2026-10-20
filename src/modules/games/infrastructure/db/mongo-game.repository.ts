import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { GameModel, GameDocument } from '../persistence/models/game-model';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { MongoBaseRepository } from 'src/modules/shared/infrastructure/db/mongo.base.repository';
import { DEFAULT_MAX_TRAIT_COST, GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';

@Injectable()
export class MongoGameRepository extends MongoBaseRepository<Game, GameDocument> implements GameRepository {
  constructor(@InjectModel(GameModel.name) model: Model<GameDocument>, rsqlParser: RsqlParser) {
    super(model, rsqlParser);
  }

  async findByRealm(realmId: string): Promise<Game[]> {
    const docs = await this.model.find({ realm: realmId }).sort({ name: 1 });
    return docs.map(doc => this.mapToEntity(doc));
  }

  private mapPowerLevel(doc: GameDocument): GamePowerLevel {
    const powerLevel = doc.powerLevel;
    if (!powerLevel) {
      return powerLevel;
    }
    return new GamePowerLevel(
      powerLevel.baseDevPoints,
      powerLevel.statRandomMin,
      powerLevel.statBoostPotential,
      powerLevel.statBoostTemporary,
      powerLevel.statCreationBoost,
      powerLevel.statCreationSwap,
      powerLevel.maxTraitCost ?? DEFAULT_MAX_TRAIT_COST,
    );
  }

  protected mapToEntity(doc: GameDocument): Game {
    return Game.fromProps({
      id: doc._id,
      name: doc.name,
      realmId: doc.realmId,
      realmName: doc.realmName,
      status: doc.status,
      options: doc.options,
      powerLevel: this.mapPowerLevel(doc),
      description: doc.description,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      accessType: doc.accessType,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
