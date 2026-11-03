import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { CharacterAccess } from '../../../characters/application/services/character-access.service.js';
import { FactionAccess } from '../../../factions/application/services/faction-access.service.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../factions/application/ports/faction-repository.port.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { Item } from '../../domain/aggregates/item.js';

/**
 * Who may read and change an item of a strategic game (spec 021, decision 2). An item belongs to a character or to a
 * faction, and follows it:
 * - read: its owner, or whoever reads the whole sheet of its character or the whole faction that holds it (spec 071,
 *   decisions 11 and 12): the masters, admins, other APIs and the members of the faction;
 * - change and delete: its owner, an admin, the owner of the game and, for the item of a character, the owner of the
 *   character (the rules of the character, CharacterAccess).
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
    if (GameAccess.isAdmin(roles) || item.owner === userId) return;
    if (await this.ownsCharacter(item, userId)) return;
    this.gameAccess.checkManage(await this.gameAccess.findGame(item.gameId), userId, roles, 'this item');
  }

  async checkRead(item: Item, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.readsAll(roles) || item.owner === userId) return;
    if (item.characterId) {
      const character = await this.characterRepository.findById(item.characterId);
      if (character) return this.characterAccess.checkRead(character, userId, roles);
    } else if (item.factionId) {
      const faction = await this.factionRepository.findById(item.factionId);
      if (faction) return this.factionAccess.checkFullRead(faction, userId, roles);
    }
    if (!this.gameAccess.canManage(await this.gameAccess.findGame(item.gameId), userId, roles)) {
      throw new ForbiddenError('You do not have permission to read this item');
    }
  }

  /**
   * The items a user can read: of the games they master, of the factions they are a member of and their characters,
   * of their own characters, and their own.
   */
  async readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const [masterGameIds, factionIds, ownCharacterIds] = await Promise.all([
      this.gameAccess.masterGameIds(userId),
      this.factionAccess.memberFactionIds(userId),
      this.characterRepository.findIdsByOwner(userId),
    ]);
    const factionCharacterIds = await this.characterRepository.findIdsByFactionIds(factionIds);
    return QueryCriteria.anyOf([
      QueryCriteria.in('gameId', masterGameIds),
      QueryCriteria.in('factionId', factionIds),
      QueryCriteria.in('characterId', [...new Set([...ownCharacterIds, ...factionCharacterIds])]),
      QueryCriteria.eq('owner', userId),
    ]);
  }

  private async ownsCharacter(item: Item, userId: string): Promise<boolean> {
    if (!item.characterId) return false;
    const character = await this.characterRepository.findById(item.characterId);
    return !!character && character.owner === userId;
  }
}
