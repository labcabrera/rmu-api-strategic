import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Item } from '../../domain/aggregates/item.js';

/**
 * Who may read and change an item of a strategic game (spec 021, decision 2). An item belongs to a character or to a
 * faction, and follows it:
 * - read: its owner, the owner of its character, or whoever can read its game;
 * - change and delete: its owner, an admin, the owner of the game and, for the item of a character, the owner of the
 *   character (the rules of the character, CharacterAccess).
 */
@Injectable()
export class ItemAccess {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async checkChange(item: Item, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.isAdmin(roles) || item.owner === userId) return;
    if (await this.ownsCharacter(item, userId)) return;
    this.gameAccess.checkManage(await this.gameAccess.findGame(item.gameId), userId, roles, 'this item');
  }

  async checkRead(item: Item, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.readsAll(roles) || item.owner === userId) return;
    if (await this.ownsCharacter(item, userId)) return;
    await this.gameAccess.checkRead(await this.gameAccess.findGame(item.gameId), userId, roles, 'this item');
  }

  /** The items a user can read: of the games they can read, their own, and those of their characters. */
  async readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const [inGamesOrOwned, characterIds] = await Promise.all([
      this.gameAccess.childrenFilter(userId, roles, true),
      this.characterRepository.findIdsByOwner(userId),
    ]);
    return QueryCriteria.anyOf([inGamesOrOwned, QueryCriteria.in('characterId', characterIds)]);
  }

  private async ownsCharacter(item: Item, userId: string): Promise<boolean> {
    if (!item.characterId) return false;
    const character = await this.characterRepository.findById(item.characterId);
    return !!character && character.owner === userId;
  }
}
