import { Character } from '../../domain/aggregates/character.aggregate';
import { BaseRepository } from 'src/modules/shared/application/ports/base-repository';

export interface CharacterRepository extends BaseRepository<Character> {
  findByGameId(gameId: string): Promise<Character[]>;

  findByRaceId(raceId: string): Promise<Character[]>;

  deleteByGameId(gameId: string): Promise<void>;
}
