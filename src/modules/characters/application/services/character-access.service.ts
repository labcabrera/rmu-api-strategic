import { Inject, Injectable } from '@nestjs/common';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors/errors.js';
import { Character } from '../../domain/aggregates/character.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../ports/character-repository.port.js';

/**
 * Who may read and change a character (spec 021, decision 2; F-strategic-15):
 * - read: its owner, or whoever can read its strategic game (public game, owner of the game, its players, admin);
 * - change and delete: its owner, the owner of its strategic game or an admin. rmu-api-tactical applies the outcome
 *   of a tactical game with the token of the user who runs it (the owner of the strategic game), so that owner must
 *   be able to change the characters of the other players;
 * - create: rmu-user or rmu-admin, in any game: a player creates their character in the private game of the game
 *   master, and then reads and changes it as its owner.
 * Some health operations are narrower (CharacterHealthStore): injuries and conditions are for the game owner.
 */
@Injectable()
export class CharacterAccess {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  /** The character, or a 404; a 403 if the user may not change it. */
  async loadForChange(characterId: string, userId: string, roles: string[]): Promise<Character> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    await this.checkChange(character, userId, roles);
    return character;
  }

  async checkChange(character: Character, userId: string, roles: string[]): Promise<void> {
    if (await this.canChange(character, userId, roles)) return;
    throw new ForbiddenError('You do not have permission to change this character');
  }

  async canChange(character: Character, userId: string, roles: string[]): Promise<boolean> {
    if (GameAccess.isAdmin(roles) || character.owner === userId) return true;
    return this.gameAccess.canManage(await this.gameAccess.findGame(character.gameId), userId, roles);
  }

  async checkRead(character: Character, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.readsAll(roles) || character.owner === userId) return;
    await this.gameAccess.checkRead(await this.gameAccess.findGame(character.gameId), userId, roles, 'this character');
  }

  /** A new character: rmu-user or rmu-admin. */
  checkCreate(roles: string[]): void {
    GameAccess.checkCreateRole(roles, 'characters');
  }

  /** The characters a user can read: their own, and those of the games they can read. */
  readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    return this.gameAccess.childrenFilter(userId, roles, true);
  }
}
