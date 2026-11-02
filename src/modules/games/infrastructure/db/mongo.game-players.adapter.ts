import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CharacterModel, type CharacterDocument } from '../../../characters/infrastructure/persistence/models/character.model.js';
import type { GamePlayersPort } from '../../application/ports/game-players.port.js';

/** Reads the characters collection directly: the characters module depends on games, not the other way round. */
@Injectable()
export class MongoGamePlayersAdapter implements GamePlayersPort {
  constructor(@InjectModel(CharacterModel.name) private readonly characters: Model<CharacterDocument>) {}

  async isPlayer(gameId: string, userId: string): Promise<boolean> {
    return (await this.characters.exists({ gameId, owner: userId })) !== null;
  }

  async gamesOf(userId: string): Promise<string[]> {
    const ids = await this.characters.distinct('gameId', { owner: userId });
    return ids.map(String);
  }
}
