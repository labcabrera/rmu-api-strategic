import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { CharacterAccess } from '../../../characters/application/services/character-access.service.js';
import { FactionAccess } from '../../../factions/application/services/faction-access.service.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../factions/application/ports/faction-repository.port.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Item } from '../../domain/aggregates/item.js';

/**
 * Who may read and change an item of a strategic game (spec 021, decision 2). An item belongs to a character or to a
 * faction, and follows it (spec 072):
 * - read: every member of the game, admins, other APIs, its owner, and the owner of its character after leaving the
 *   game;
 * - change and delete: the masters, an admin and the players of the faction that holds it (or of the faction of its
 *   character).
 */
@Injectable()
export class ItemAccess {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly gameAccess: GameAccess,
    private readonly characterAccess: CharacterAccess,
    private readonly factionAccess: FactionAccess,
  ) {}

  async checkChange(item: Item, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.isAdmin(roles)) return;
    if (item.characterId) {
      const character = await this.characterRepository.findById(item.characterId);
      if (character && (await this.characterAccess.canChange(character, userId, roles))) return;
    } else if (item.factionId) {
      const faction = await this.factionRepository.findById(item.factionId);
      if (faction && (await this.factionAccess.canWrite(faction, userId, roles))) return;
    }
    this.gameAccess.checkManage(await this.gameAccess.findGame(item.gameId), userId, roles, 'this item');
  }

  async checkRead(item: Item, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.readsAll(roles) || item.owner === userId) return;
    if (item.characterId) {
      const character = await this.characterRepository.findById(item.characterId);
      if (character) return this.characterAccess.checkRead(character, userId, roles);
    } else if (item.factionId) {
      const faction = await this.factionRepository.findById(item.factionId);
      if (faction) return this.factionAccess.checkRead(faction, userId, roles);
    }
    await this.gameAccess.checkRead(await this.gameAccess.findGame(item.gameId), userId, roles, 'this item');
  }

  /** The items a user can read: of the games they are a member of, of their own characters, and their own. */
  async readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const [gameIds, ownCharacterIds] = await Promise.all([
      this.gameAccess.memberGameIds(userId),
      this.characterRepository.findIdsByOwner(userId),
    ]);
    return QueryCriteria.anyOf([
      QueryCriteria.in('gameId', gameIds),
      QueryCriteria.in('characterId', ownCharacterIds),
      QueryCriteria.eq('owner', userId),
    ]);
  }
}
