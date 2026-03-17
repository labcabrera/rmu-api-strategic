import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { CharacterRepository } from '../../application/ports/character.repository';
import { Character } from '../../domain/aggregates/character.aggregate';
import { CharacterDocument, CharacterModel } from '../persistence/models/character.model';
import { RsqlParser } from 'src/modules/shared/infrastructure/persistence/repositories/rsql-parser';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { Page } from 'src/modules/shared/domain/entities/page';

@Injectable()
export class MongoCharacterRepository implements CharacterRepository {
  constructor(
    @InjectModel(CharacterModel.name) private characterModel: Model<CharacterDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Character | null> {
    const readed = await this.characterModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const characters = await this.characterModel.find({ gameId });
    return characters.map((doc) => this.mapToEntity(doc));
  }

  async findByRaceId(raceId: string): Promise<Character[]> {
    const characters = await this.characterModel.find({ 'info.race.id': raceId });
    return characters.map((doc) => this.mapToEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.characterModel.deleteMany({ gameId });
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Character>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [charactersDocs, totalElements] = await Promise.all([
      this.characterModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.characterModel.countDocuments(mongoQuery),
    ]);
    const content = charactersDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Character>(content, page, size, totalElements);
  }

  async save(request: Character): Promise<Character> {
    const payload: any = { ...request, _id: request.id };
    if (request.faction) {
      payload.faction = { id: request.faction.id, name: request.faction.name };
    }
    const model = new this.characterModel(payload);
    await model.save();
    return this.mapToEntity(model);
  }

  async update(update: Character): Promise<Character> {
    const plain: any = update.getProps();
    if (plain.faction) {
      plain.faction = { id: plain.faction.id, name: plain.faction.name };
    }
    const updated = await this.characterModel.findByIdAndUpdate({ _id: update.id }, { $set: plain }, { new: true });
    if (!updated) {
      throw new NotFoundError('Character', update.id);
    }
    return this.mapToEntity(updated);
  }

  async deleteById(id: string): Promise<Character | null> {
    const result = await this.characterModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.characterModel.exists({ _id: id });
    return exists !== null;
  }

  private mapToEntity(doc: CharacterDocument): Character {
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
      items: doc.items,
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
