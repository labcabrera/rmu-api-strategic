import { CharacterLevelDevRepository } from 'src/modules/characters/application/ports/out/character-level-dev.repository';
import { CharacterLevelDev } from 'src/modules/characters/domain/entities/character-level-dev.entity';

export class MongoCharacterLevelDevRepository implements CharacterLevelDevRepository {
  findByCharacterAndLevel(characterId: string, level: number): Promise<CharacterLevelDev | null> {
    throw new Error('Method not implemented.');
  }
  create(characterLevelDevelopment: Partial<CharacterLevelDev>): Promise<CharacterLevelDev> {
    throw new Error('Method not implemented.');
  }
  update(id: string, update: Partial<CharacterLevelDev>): Promise<CharacterLevelDev> {
    throw new Error('Method not implemented.');
  }
  deleteByCharacter(characterId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
