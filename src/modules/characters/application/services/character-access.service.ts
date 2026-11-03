import { Injectable } from '@nestjs/common';
import { Game } from '../../../games/domain/aggregates/game.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { GameRealmService } from '../../../games/application/services/game-realm.service.js';
import {
  canWrite,
  type EntityAccess,
  FactionAccess,
  StrategicViewer,
} from '../../../factions/application/services/faction-access.service.js';
import type { Faction } from '../../../factions/domain/aggregates/faction.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { ForbiddenError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { Character } from '../../domain/aggregates/character.js';

/**
 * Who may read and change a character (spec 021, decision 2; F-strategic-15; specs 071 and 072). A character follows
 * its faction (StrategicViewer):
 * - read: every member of the game, admins, other APIs, and its owner also after leaving the game;
 * - change and delete: the players of its faction while they are players of the game, the masters or an admin. Its
 *   owner alone no longer changes it (spec 072, decision 7). rmu-api-tactical applies the outcome of a tactical game
 *   with the token of the user who runs it (a master), so the masters change the characters of the players;
 * - create: a player of the faction or a master (spec 072, decision 7), while the owner of the game reads its realm
 *   (spec 071, decision 3).
 * Some operations are narrower (checkManage, CharacterHealthStore): add-xp, injuries and conditions are for the
 * masters.
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

  access(character: Character, userId: string, roles: string[]): Promise<EntityAccess> {
    return this.viewer(userId, roles).character(character);
  }

  async checkChange(character: Character, userId: string, roles: string[]): Promise<void> {
    if (await this.canChange(character, userId, roles)) return;
    throw new ForbiddenError('You do not have permission to change this character');
  }

  async canChange(character: Character, userId: string, roles: string[]): Promise<boolean> {
    return canWrite(await this.access(character, userId, roles));
  }

  /** Changes the players may not make (add-xp, undoing a fighting style ability): the masters or an admin. */
  async checkManage(character: Character, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.isAdmin(roles)) return;
    if (this.gameAccess.canManage(await this.gameAccess.findGame(character.gameId), userId, roles)) return;
    throw new ForbiddenError('Only the game master can change this of the character');
  }

  /** The sheet and what hangs from it (healing log, spells, items). */
  async checkRead(character: Character, userId: string, roles: string[]): Promise<void> {
    if ((await this.access(character, userId, roles)) !== 'none') return;
    throw new ForbiddenError('You do not have permission to read this character');
  }

  /** A new character: rmu-user or rmu-admin. */
  checkCreate(roles: string[]): void {
    GameAccess.checkCreateRole(roles, 'characters');
  }

  /**
   * A new character in a faction of a game: a player of the faction or a master, while the owner of the game reads its
   * realm (spec 072, decision 7; spec 071, decision 3).
   */
  async checkCreateIn(game: Game, faction: Faction, userId: string, roles: string[]): Promise<void> {
    this.checkCreate(roles);
    const level = this.gameAccess.level(game, userId, roles);
    if (!this.gameAccess.isPlayer(game, userId, roles)) {
      throw new ForbiddenError('Only the players of the game create characters in it', 'not-a-player');
    }
    if (!canWrite(StrategicViewer.byLevel(level, faction.isPlayer(userId)))) {
      throw new ForbiddenError('Only the players of the faction and the masters create characters in it', 'not-a-faction-player');
    }
    if (!(await this.gameRealm.isReadable(game.realmId, game.owner, []))) {
      throw new ValidationError('The owner of the game no longer reads its realm', 'realm-not-readable');
    }
  }

  /** The characters a user can read: their own, and those of the games they are a member of. */
  readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    return this.gameAccess.childrenFilter(userId, roles, true);
  }
}
