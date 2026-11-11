import { Inject, Injectable } from '@nestjs/common';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { RMU_ADMIN, RMU_SERVICE, RMU_USER } from '../../../shared/domain/entities/user-roles.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { Game } from '../../domain/aggregates/game.js';
import { type GameAccessLevel, gameAccessAtLeast } from '../../domain/value-objects/game-member.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../ports/game-repository.port.js';

/**
 * Who may read and change a strategic game and what hangs from it (spec 071), by the level of the user:
 * - owner: the owner of the game, an admin, or another API (the service account carries rmu-admin; rmu-service reads);
 * - master: a co-master, who changes everything but deleting the game, its visibility and its co-masters;
 * - player and spectator: members of the game, who read it (what they see of each faction and character is decided by
 *   CharacterAccess and FactionAccess);
 * - cover: anybody, for a public game: only its card;
 * - none: anybody else.
 */
@Injectable()
export class GameAccess {
  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  static isAdmin(roles: string[]): boolean {
    return roles.includes(RMU_ADMIN);
  }

  /** Reads also pass for the token of another API (client credentials), which reads what it works on. */
  static readsAll(roles: string[]): boolean {
    return roles.includes(RMU_ADMIN) || roles.includes(RMU_SERVICE);
  }

  static checkCreateRole(roles: string[], what: string): void {
    if (roles.includes(RMU_ADMIN) || roles.includes(RMU_USER)) return;
    throw new ForbiddenError(`You do not have permission to create ${what}`);
  }

  /** The level of a user in a game; a missing game is `none` (an admin still gets `owner`). */
  level(game: Game | null, userId: string, roles: string[]): GameAccessLevel {
    if (GameAccess.isAdmin(roles)) return 'owner';
    if (!game) return GameAccess.readsAll(roles) ? 'spectator' : 'none';
    if (game.owner === userId) return 'owner';
    const role = game.roleOf(userId);
    if (role) return role;
    if (GameAccess.readsAll(roles)) return 'spectator';
    return game.accessType === 'public' ? 'cover' : 'none';
  }

  /** The game and what hangs from it: members (spectators and up), admins and other APIs. */
  canRead(game: Game | null, userId: string, roles: string[]): Promise<boolean> {
    return Promise.resolve(gameAccessAtLeast(this.level(game, userId, roles), 'spectator'));
  }

  /** The card of the game: a public game for anybody, or a member. */
  canReadCover(game: Game | null, userId: string, roles: string[]): boolean {
    return gameAccessAtLeast(this.level(game, userId, roles), 'cover');
  }

  /** Changing the game and what hangs from it: the owner, a co-master or an admin. */
  canManage(game: Game | null, userId: string, roles: string[]): boolean {
    return gameAccessAtLeast(this.level(game, userId, roles), 'master');
  }

  /** A player of the game or more: creates characters in it (spec 071, decision 7). */
  isPlayer(game: Game | null, userId: string, roles: string[]): boolean {
    return gameAccessAtLeast(this.level(game, userId, roles), 'player');
  }

  async checkRead(game: Game | null, userId: string, roles: string[], what = 'this game'): Promise<void> {
    if (!(await this.canRead(game, userId, roles))) throw new ForbiddenError(`You do not have permission to read ${what}`);
  }

  checkManage(game: Game | null, userId: string, roles: string[], what = 'this game'): void {
    if (!this.canManage(game, userId, roles)) throw new ForbiddenError(`You do not have permission to change ${what}`);
  }

  /** Deleting the game, its visibility and its co-masters: the owner or an admin. */
  checkOwner(game: Game | null, userId: string, roles: string[], what = 'this game'): void {
    if (this.level(game, userId, roles) !== 'owner') throw new ForbiddenError(`Only the owner of the game can change ${what}`);
  }

  findGame(gameId: string | null | undefined): Promise<Game | null> {
    return gameId ? this.gameRepository.findById(gameId) : Promise.resolve(null);
  }

  /** The criteria of the games a user lists (empty for an admin): public (their card), owned or where they are members. */
  readableGames(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return Promise.resolve(QueryCriteria.empty());
    return Promise.resolve(
      QueryCriteria.anyOf([
        QueryCriteria.eq('accessType', 'public'),
        QueryCriteria.eq('owner', userId),
        QueryCriteria.eq('members.userId', userId),
      ]),
    );
  }

  /** The ids of the games whose content the user reads: owned or where they are members (not the public ones). */
  async memberGameIds(userId: string): Promise<string[]> {
    return this.gameRepository.findIds(
      QueryCriteria.anyOf([QueryCriteria.eq('owner', userId), QueryCriteria.eq('members.userId', userId)]),
    );
  }

  /** The ids of the games the user masters: owned or as a co-master. */
  async masterGameIds(userId: string): Promise<string[]> {
    return this.gameRepository.findIds(
      QueryCriteria.anyOf([QueryCriteria.eq('owner', userId), QueryCriteria.elemMatch('members', { userId, role: 'master' })]),
    );
  }

  /**
   * The filter of a listing of children of games (`gameId` in the games the user is a member of), or empty for an
   * admin. `alsoOwned` adds what the user owns in a game they cannot read (an expelled player keeps their characters).
   */
  async childrenFilter(userId: string, roles: string[], alsoOwned = false): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const inGames = QueryCriteria.in('gameId', await this.memberGameIds(userId));
    return alsoOwned ? QueryCriteria.anyOf([inGames, QueryCriteria.eq('owner', userId)]) : inGames;
  }
}
