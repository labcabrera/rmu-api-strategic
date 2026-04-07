import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { CharacterRepository } from '../../application/ports/character.repository';
import { Character } from '../../domain/aggregates/character.aggregate';
import { CharacterDocument, CharacterModel } from '../persistence/models/character.model';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { MongoBaseRepository } from 'src/modules/shared/infrastructure/db/mongo.base.repository';

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
    return characters.map((doc) => this.mapToEntity(doc));
  }

  async findByRaceId(raceId: string): Promise<Character[]> {
    const characters = await this.model.find({ 'info.race.id': raceId });
    return characters.map((doc) => this.mapToEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
  }

  protected mapToEntity(doc: CharacterDocument): Character {
    return Character.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      faction: new NamedEntity(doc.faction.id, doc.faction.name),
      name: doc.name,
      info: doc.info,
      roleplay: doc.roleplay,
      experience: doc.experience,
      statistics: doc.statistics,
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
}
