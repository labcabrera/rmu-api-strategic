import { Injectable } from '@nestjs/common';
import { Game } from '../../../games/domain/aggregates/game.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { GameRealmService } from '../../../games/application/services/game-realm.service.js';
import { type CharacterView, FactionAccess, type StrategicViewer } from '../../../factions/application/services/faction-access.service.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { ForbiddenError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { Character } from '../../domain/aggregates/character.js';

/**
 * Who may read and change a character (spec 021, decision 2; F-strategic-15; spec 071):
 * - read: the sheet for its owner (also after leaving the game), the masters, admins, other APIs and the members of
 *   its faction; the summary for the other members of the game (decision 11; StrategicViewer);
 * - change and delete: its owner while they are a player of the game, its masters or an admin. rmu-api-tactical
 *   applies the outcome of a tactical game with the token of the user who runs it (a master of the strategic game),
 *   so the masters must be able to change the characters of the players;
 * - create: a player, co-master or owner of the game, or an admin (spec 071, decision 7), while the owner of the game
 *   reads its realm (decision 3).
 * Some health operations are narrower (CharacterHealthStore): injuries and conditions are for the masters.
 */
@Injectable()
export class CharacterAccess {
  constructor(
    private readonly gameAccess: GameAccess,
    private readonly gameRealm: GameRealmService,
    private readonly factionAccess: FactionAccess,
  ) {}

  viewer(userId: string, roles: string[]): StrategicViewer {
    return this.factionAccess.viewer(userId, roles);
  }

  view(character: Character, userId: string, roles: string[]): Promise<CharacterView> {
    return this.viewer(userId, roles).character(character);
  }

  async checkChange(character: Character, userId: string, roles: string[]): Promise<void> {
    if (await this.canChange(character, userId, roles)) return;
    throw new ForbiddenError('You do not have permission to change this character');
  }

  async canChange(character: Character, userId: string, roles: string[]): Promise<boolean> {
    if (GameAccess.isAdmin(roles)) return true;
    const game = await this.gameAccess.findGame(character.gameId);
    // An ex-player keeps reading their characters, but no longer changes them (spec 071, decision 5).
    if (character.owner === userId && (!game || this.gameAccess.isPlayer(game, userId, roles))) return true;
    return this.gameAccess.canManage(game, userId, roles);
  }

  /** Changes its owner may not make alone (spec 032: undoing a fighting style ability): the game owner or an admin. */
  async checkManage(character: Character, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.isAdmin(roles)) return;
    if (this.gameAccess.canManage(await this.gameAccess.findGame(character.gameId), userId, roles)) return;
    throw new ForbiddenError('Only the game master can change this of the character');
  }

  /** The whole sheet and what hangs from it (healing log, spells, items). */
  async checkRead(character: Character, userId: string, roles: string[]): Promise<void> {
    if ((await this.view(character, userId, roles)) === 'full') return;
    throw new ForbiddenError('You do not have permission to read this character');
  }

  /** At least its summary (GET by id). */
  async checkReadSummary(character: Character, userId: string, roles: string[]): Promise<CharacterView> {
    const view = await this.view(character, userId, roles);
    if (view === 'none') throw new ForbiddenError('You do not have permission to read this character');
    return view;
  }

  /** A new character: rmu-user or rmu-admin. */
  checkCreate(roles: string[]): void {
    GameAccess.checkCreateRole(roles, 'characters');
  }

  /** A new character in a game: a player or more of it, while its owner reads its realm (spec 071, decisions 3 and 7). */
  async checkCreateIn(game: Game, userId: string, roles: string[]): Promise<void> {
    this.checkCreate(roles);
    if (!this.gameAccess.isPlayer(game, userId, roles)) {
      throw new ForbiddenError('Only the players of the game create characters in it', 'not-a-player');
    }
    if (!(await this.gameRealm.isReadable(game.realmId, game.owner, []))) {
      throw new ValidationError('The owner of the game no longer reads its realm', 'realm-not-readable');
    }
  }

  /** The characters a user can read: their own, and those of the games they can read. */
  readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    return this.gameAccess.childrenFilter(userId, roles, true);
  }
}
