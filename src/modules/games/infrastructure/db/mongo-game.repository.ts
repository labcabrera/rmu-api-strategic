import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { RsqlParser } from 'src/modules/shared/infrastructure/messaging/rsql-parser';
import { GameModel, GameDocument } from '../persistence/models/game-model';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { NotFoundError } from 'src/modules/shared/domain/errors';

@Injectable()
export class MongoGameRepository implements GameRepository {
  constructor(
    @InjectModel(GameModel.name) private gameModel: Model<GameDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Game | null> {
    const readed = await this.gameModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRealm(realmId: string): Promise<Game[]> {
    const docs = await this.gameModel.find({ realm: realmId }).sort({ name: 1 });
    return docs.map((doc) => this.mapToEntity(doc));
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Game>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [gamesDocs, totalElements] = await Promise.all([
      this.gameModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.gameModel.countDocuments(mongoQuery),
    ]);
    const content = gamesDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Game>(content, page, size, totalElements);
  }

  async save(game: Game): Promise<Game> {
    const model = new this.gameModel({ ...game.toProps(), _id: game.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<Game>): Promise<Game> {
    const updatedRace = await this.gameModel.findByIdAndUpdate(id, { $set: request }, { new: true });
    if (!updatedRace) {
      throw new NotFoundError('Race', id);
    }
    return this.mapToEntity(updatedRace);
  }

  async deleteById(id: string): Promise<Game | null> {
    const result = await this.gameModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  private mapToEntity(doc: GameDocument): Game {
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
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
