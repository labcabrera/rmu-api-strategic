import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { FactionMembershipPort } from '../../application/ports/faction-membership.port.js';
import { FactionModel } from '../persistence/models/faction.model.js';
import { CharacterModel } from '../../../characters/infrastructure/persistence/models/character.model.js';

/** Reads the characters collection directly: the characters module depends on factions, not the other way. */
@Injectable()
export class MongoFactionMembershipAdapter implements FactionMembershipPort {
  constructor(
    @InjectModel(FactionModel.name) private readonly factions: Model<FactionModel>,
    @InjectModel(CharacterModel.name) private readonly characters: Model<CharacterModel>,
  ) {}

  async memberFactionIds(userId: string, gameIds: string[]): Promise<string[]> {
    if (gameIds.length === 0) return [];
    const [withCharacters, led] = await Promise.all([
      this.characters.distinct('faction.id', { owner: userId, gameId: { $in: gameIds } }),
      this.factions.distinct('_id', { leaderId: userId, gameId: { $in: gameIds } }),
    ]);
    return [...new Set([...withCharacters, ...led])];
  }
}
