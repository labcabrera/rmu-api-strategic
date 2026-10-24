import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameRepository } from '../../application/ports/game-repository.port';
import { GameModel, GameDocument } from '../persistence/models/game.model';
import { Game } from '../../domain/aggregates/game';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository';
import { GamePowerLevel, resolvePowerLevel } from '../../domain/value-objects/game-power-level.vo';
import { GameOptions, resolveOptions } from '../../domain/value-objects/game-options.vo';

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
    // Documents stored before a field existed get the Superior default
    const resolved = resolvePowerLevel(powerLevel);
    return new GamePowerLevel(
      powerLevel.baseDevPoints,
      powerLevel.statRandomMin,
      powerLevel.statBoostPotential,
      powerLevel.statBoostTemporary,
      powerLevel.statCreationBoost,
      powerLevel.statCreationSwap,
      resolved.maxTraitCost,
      resolved.raceDevPointsPerLevel,
      resolved.creationBonusDevPoints,
      resolved.statPoints,
      resolved.knackCount,
      resolved.knackBonus,
    );
  }

  private mapOptions(doc: GameDocument): GameOptions {
    const options = doc.options;
    if (!options) {
      return options;
    }
    const resolved = resolveOptions(options);
    return new GameOptions(
      options.experienceMultiplier,
      options.fatigueMultiplier,
      options.boardScaleMultiplier,
      options.letality,
      resolved.allowThirdRank,
      resolved.talentPolicy,
      resolved.bonusDevPointsCapAtCreation,
      resolved.statGeneration,
      resolved.openRounds,
    );
  }

  protected mapToEntity(doc: GameDocument): Game {
    return Game.fromProps({
      id: doc._id,
      name: doc.name,
      realmId: doc.realmId,
      realmName: doc.realmName,
      status: doc.status,
      options: this.mapOptions(doc),
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
