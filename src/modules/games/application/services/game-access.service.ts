import { Inject, Injectable } from '@nestjs/common';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { RMU_ADMIN, RMU_SERVICE, RMU_USER } from '../../../shared/domain/entities/user-roles.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { Game } from '../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../ports/game-repository.port.js';

/**
 * Who may read and manage a strategic game and what hangs from it (spec 021, decision 2):
 * - read: a public game, its owner, an admin or another API (rmu-service). Factions, characters and items inherit the game's accessType;
 * - manage (the game, its factions and their gold and XP): the owner of the game or an admin;
 * - create: rmu-user or rmu-admin.
 * The service account token carries rmu-admin, so the calls of other APIs pass.
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

  canRead(game: Game | null, userId: string, roles: string[]): boolean {
    if (GameAccess.readsAll(roles)) return true;
    return !!game && (game.accessType === 'public' || game.owner === userId);
  }

  canManage(game: Game | null, userId: string, roles: string[]): boolean {
    if (GameAccess.isAdmin(roles)) return true;
    return !!game && game.owner === userId;
  }

  checkRead(game: Game | null, userId: string, roles: string[], what = 'this game'): void {
    if (!this.canRead(game, userId, roles)) throw new ForbiddenError(`You do not have permission to read ${what}`);
  }

  checkManage(game: Game | null, userId: string, roles: string[], what = 'this game'): void {
    if (!this.canManage(game, userId, roles)) throw new ForbiddenError(`You do not have permission to change ${what}`);
  }

  findGame(gameId: string | null | undefined): Promise<Game | null> {
    return gameId ? this.gameRepository.findById(gameId) : Promise.resolve(null);
  }

  /** The criteria of the games a user can read (empty for an admin): public or owned. */
  static readableGames(userId: string, roles: string[]): QueryCriteria {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    return QueryCriteria.anyOf([QueryCriteria.eq('accessType', 'public'), QueryCriteria.eq('owner', userId)]);
  }

  /**
   * The filter of a listing of children of games (`gameId` in the readable games), or empty for an admin. `alsoOwned`
   * adds what the user owns in a game they cannot read (their own character in someone else's private game).
   */
  async childrenFilter(userId: string, roles: string[], alsoOwned = false): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const gameIds = await this.gameRepository.findIds(GameAccess.readableGames(userId, roles));
    const inGames = QueryCriteria.in('gameId', gameIds);
    return alsoOwned ? QueryCriteria.anyOf([inGames, QueryCriteria.eq('owner', userId)]) : inGames;
  }
}
