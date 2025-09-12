import { InjectModel } from '@nestjs/mongoose';
import { CharacterLevelDevRepository } from 'src/modules/characters/application/ports/character-level-dev.repository';
import { CharacterLevelDev } from 'src/modules/characters/domain/aggregates/character-level-dev.aggregate';
import { CharacterLevelDevDocument, CharacterLevelDevModel } from '../models/character-level-dev.model';
import { Document, Model } from 'mongoose';
import { NotFoundError } from 'src/modules/shared/domain/errors';

export class MongoCharacterLevelDevRepository implements CharacterLevelDevRepository {
  constructor(@InjectModel(CharacterLevelDevModel.name) private cldModel: Model<CharacterLevelDevDocument>) {}

  async findByCharacterAndLevel(characterId: string, level: number): Promise<CharacterLevelDev | null> {
    const query = { characterId, level };
    const entity = await this.cldModel.findOne(query);
    return entity ? this.mapToEntity(entity) : null;
  }

  async create(partial: Partial<CharacterLevelDev>): Promise<CharacterLevelDev> {
    const model = new this.cldModel(partial);
    await model.save();
    return this.mapToEntity(model);
  }
  async update(id: string, update: Partial<CharacterLevelDev>): Promise<CharacterLevelDev> {
    const current = await this.cldModel.findById(id);
    if (!current) {
      throw new NotFoundError('Character', id);
    }
    const updatedCharacter = await this.cldModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedCharacter) {
      throw new NotFoundError('Character', id);
    }
    return this.mapToEntity(updatedCharacter);
  }

  async deleteByCharacter(characterId: string): Promise<void> {
    await this.cldModel.deleteMany({ characterId });
  }

  private mapToEntity(doc: CharacterLevelDevDocument): CharacterLevelDev {
    return {
      id: doc._id as string,
      characterId: doc.characterId,
      level: doc.level,
      skills: doc.skills,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
