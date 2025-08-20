import { CharacterLevelDev } from 'src/modules/characters/domain/entities/character-level-dev.entity';

export interface CharacterLevelDevRepository {
  findByCharacterAndLevel(characterId: string, level: number): Promise<CharacterLevelDev | null>;

  create(characterLevelDevelopment: Partial<CharacterLevelDev>): Promise<CharacterLevelDev>;

  update(id: string, update: Partial<CharacterLevelDev>): Promise<CharacterLevelDev>;

  deleteByCharacter(characterId: string): Promise<void>;
}
