import { Character } from '../../domain/aggregates/character.js';
import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';

export interface CharacterRepository extends BaseRepository<Character> {
  findByGameId(gameId: string): Promise<Character[]>;

  findByRaceId(raceId: string): Promise<Character[]>;

  /** The ids of the characters of a user (the items of their characters, in the item listings). */
  findIdsByOwner(owner: string): Promise<string[]>;

  deleteByGameId(gameId: string): Promise<void>;
}

export const CHARACTER_REPOSITORY = Symbol('CharacterRepository');
