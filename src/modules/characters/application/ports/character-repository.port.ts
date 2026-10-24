import { Character } from '../../domain/aggregates/character.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export interface CharacterRepository extends BaseRepository<Character> {
  findByGameId(gameId: string): Promise<Character[]>;

  findByRaceId(raceId: string): Promise<Character[]>;

  deleteByGameId(gameId: string): Promise<void>;
}

export const CHARACTER_REPOSITORY = Symbol('CharacterRepository');
