import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CharacterModel } from '../../../characters/infrastructure/persistence/models/character.model.js';
import { FactionModel } from '../../../factions/infrastructure/persistence/models/faction.model.js';
import { GameModel } from '../../../games/infrastructure/persistence/models/game.model.js';
import type { StatsReader } from '../../application/ports/stats-reader.port.js';
import type { StrategicStats } from '../../domain/strategic-stats.js';
import { readCollectionStats } from './collection-stats.reader.js';

@Injectable()
export class MongoStatsReader implements StatsReader {
  constructor(
    @InjectModel(GameModel.name) private readonly games: Model<GameModel>,
    @InjectModel(CharacterModel.name) private readonly characters: Model<CharacterModel>,
    @InjectModel(FactionModel.name) private readonly factions: Model<FactionModel>,
  ) {}

  async read(now: Date): Promise<StrategicStats> {
    const [campaigns, characters, factions] = await Promise.all([
      readCollectionStats(this.games, now, 'status'),
      readCollectionStats(this.characters, now, 'status'),
      readCollectionStats(this.factions, now),
    ]);
    return { campaigns, characters, factions };
  }
}
