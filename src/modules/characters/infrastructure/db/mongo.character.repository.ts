/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { Page } from '../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../shared/domain/errors';
import { RsqlParser } from '../../../shared/infrastructure/messaging/rsql-parser';
import { CharacterRepository } from '../../application/ports/character.repository';
import { Character } from '../../domain/aggregates/character.aggregate';
import { CharacterDocument, CharacterModel } from '../persistence/models/character.model';

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
    const model = new this.characterModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(update: Character): Promise<Character> {
    const plain = update.toPlainObject();
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
    return new Character(
      doc._id,
      doc.gameId,
      doc.factionId,
      doc.name,
      doc.info,
      doc.roleplay,
      doc.experience,
      doc.statistics,
      doc.movement,
      doc.defense,
      doc.resistances,
      doc.hp,
      doc.endurance,
      doc.power,
      doc.initiative,
      doc.skills,
      doc.items,
      doc.equipment,
      doc.attacks,
      doc.status,
      doc.description,
      doc.owner,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
