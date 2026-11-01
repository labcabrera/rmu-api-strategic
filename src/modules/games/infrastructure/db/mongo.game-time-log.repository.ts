import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page } from '../../../shared/application/pagination/page.js';
import type { GameTimeLogRepository } from '../../application/ports/game-time-log-repository.port.js';
import type { GameTimeLogEntry } from '../../domain/value-objects/game-time-log-entry.vo.js';
import { type GameTimeLogDocument, GameTimeLogModel } from '../persistence/models/game-time-log.model.js';

@Injectable()
export class MongoGameTimeLogRepository implements GameTimeLogRepository {
  constructor(@InjectModel(GameTimeLogModel.name) private readonly model: Model<GameTimeLogDocument>) {}

  async save(entry: GameTimeLogEntry): Promise<GameTimeLogEntry> {
    const { id, ...rest } = entry;
    await this.model.insertMany([{ ...rest, _id: id }]);
    return entry;
  }

  async findByGameId(gameId: string, page: number, size: number): Promise<Page<GameTimeLogEntry>> {
    const filter = { gameId };
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip(page * size)
        .limit(size)
        .lean<GameTimeLogModel[]>(),
      this.model.countDocuments(filter),
    ]);
    return new Page(
      docs.map(doc => MongoGameTimeLogRepository.mapToEntry(doc)),
      page,
      size,
      total,
    );
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
  }

  static mapToEntry(doc: GameTimeLogModel): GameTimeLogEntry {
    return {
      id: doc._id,
      gameId: doc.gameId,
      type: doc.type,
      fromDay: doc.fromDay,
      toDay: doc.toDay,
      days: doc.days,
      hours: doc.hours,
      note: doc.note ?? undefined,
      characters: doc.characters || [],
      userId: doc.userId,
      createdAt: doc.createdAt,
    };
  }
}
