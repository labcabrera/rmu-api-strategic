/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { CharacterRepository } from '../../application/ports/character.repository';
import { Character } from '../../domain/aggregates/character.aggregate';
import { CharacterDocument, CharacterModel } from '../persistence/models/character.model';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { MongoBaseRepository } from 'src/modules/shared/infrastructure/db/mongo.base.repository';
import { CharacterStat, STAT_KEYS, StatKey } from '../../domain/value-objects/character-stat.vo';

@Injectable()
export class MongoCharacterRepository extends MongoBaseRepository<Character, CharacterDocument> implements CharacterRepository {
  constructor(@InjectModel(CharacterModel.name) characterModel: Model<CharacterDocument>, rsqlParser: RsqlParser) {
    super(characterModel, rsqlParser);
  }

  async findById(id: string): Promise<Character | null> {
    const doc = await this.model.findById(id).lean();
    if (!doc) return null;
    return this.mapToEntity(doc);
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const characters = await this.model.find({ gameId });
    return characters.map(doc => this.mapToEntity(doc));
  }

  async findByRaceId(raceId: string): Promise<Character[]> {
    const characters = await this.model.find({ 'info.race.id': raceId });
    return characters.map(doc => this.mapToEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
  }

  protected mapToEntity(doc: CharacterDocument): Character {
    const statistics = this.mapStatDtoToVo(doc);
    return Character.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      faction: new NamedEntity(doc.faction.id, doc.faction.name),
      name: doc.name,
      info: doc.info,
      roleplay: doc.roleplay,
      experience: doc.experience,
      statistics: statistics,
      movement: doc.movement,
      defense: doc.defense,
      resistances: doc.resistances,
      hp: doc.hp,
      endurance: doc.endurance,
      power: doc.power,
      initiative: doc.initiative,
      skills: doc.skills,
      equipment: doc.equipment,
      attacks: doc.attacks,
      traits: doc.traits,
      status: doc.status,
      description: doc.description,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  private mapStatDtoToVo(doc: CharacterDocument): Record<StatKey, CharacterStat> {
    const statistics: Record<StatKey, CharacterStat> = {} as Record<StatKey, CharacterStat>;
    // Normalize mongoose Map / MongooseMap / POJO to a plain object so we can index by key reliably
    const statsSource: any = (() => {
      const s = (doc && (doc as any).statistics) || {};
      if (!s) return {};
      // If it's a Mongoose Map with entries()
      if (typeof s.entries === 'function') {
        try {
          return Object.fromEntries(Array.from(s.entries() as Iterable<readonly [string, any]>));
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (ignore) {
          // fallthrough
        }
      }
      // If it provides toObject / toJSON, use it
      if (typeof s.toObject === 'function') return s.toObject();
      if (typeof s.toJSON === 'function') return s.toJSON();
      // Otherwise assume it's already a plain object
      return s;
    })();
    for (const key of STAT_KEYS) {
      const statRaw = (statsSource && (statsSource[key] ?? (typeof statsSource.get === 'function' ? statsSource.get(key) : undefined))) as
        | undefined
        | { potential?: number; temporary?: number; modifiers?: Record<string, number>; totalBonus?: number };

      if (statRaw) {
        statistics[key] = new CharacterStat(
          statRaw.potential ?? 0,
          statRaw.temporary ?? 0,
          statRaw.modifiers ?? {},
          statRaw.totalBonus ?? 0,
        );
      } else {
        // Provide a sensible default so all STAT_KEYS are present
        statistics[key] = new CharacterStat(0, 0, {} as Record<string, number>, 0);
      }
    }
    return statistics;
  }
}
