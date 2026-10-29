import { Inject, Injectable } from '@nestjs/common';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { RMU_ADMIN, RMU_SERVICE, RMU_USER } from '../../../shared/domain/entities/user-roles.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { Game } from '../../domain/aggregates/game.js';
import { type GamePlayersPort, GAME_PLAYERS } from '../ports/game-players.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../ports/game-repository.port.js';

/**
 * Who may read and manage a strategic game and what hangs from it (spec 021, decision 2):
 * - read: a public game, its owner, its players (users who own a character in it), an admin or another API
 *   (rmu-service). Factions, characters and items are read as their game. rmu-api-tactical reads the game and the
 *   characters of the other players (attack targets) with the token of the player;
 * - manage (the game, its factions and their gold): the owner of the game or an admin;
 * - create: rmu-user or rmu-admin.
 * The service account token carries rmu-admin, so the calls of other APIs pass.
 */
@Injectable()
export class GameAccess {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_PLAYERS) private readonly players: GamePlayersPort,
  ) {}

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

  async canRead(game: Game | null, userId: string, roles: string[]): Promise<boolean> {
    if (GameAccess.readsAll(roles)) return true;
    if (!game) return false;
    if (game.accessType === 'public' || game.owner === userId) return true;
    return this.players.isPlayer(game.id, userId);
  }

  canManage(game: Game | null, userId: string, roles: string[]): boolean {
    if (GameAccess.isAdmin(roles)) return true;
    return !!game && game.owner === userId;
  }

  async checkRead(game: Game | null, userId: string, roles: string[], what = 'this game'): Promise<void> {
    if (!(await this.canRead(game, userId, roles))) throw new ForbiddenError(`You do not have permission to read ${what}`);
  }

  checkManage(game: Game | null, userId: string, roles: string[], what = 'this game'): void {
    if (!this.canManage(game, userId, roles)) throw new ForbiddenError(`You do not have permission to change ${what}`);
  }

  findGame(gameId: string | null | undefined): Promise<Game | null> {
    return gameId ? this.gameRepository.findById(gameId) : Promise.resolve(null);
  }

  /** The criteria of the games a user can read (empty for an admin): public, owned or where they play. */
  async readableGames(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const played = await this.players.gamesOf(userId);
    return QueryCriteria.anyOf([
      QueryCriteria.eq('accessType', 'public'),
      QueryCriteria.eq('owner', userId),
      QueryCriteria.in('_id', played),
    ]);
  }

  /**
   * The filter of a listing of children of games (`gameId` in the readable games), or empty for an admin. `alsoOwned`
   * adds what the user owns in a game they cannot read.
   */
  async childrenFilter(userId: string, roles: string[], alsoOwned = false): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const gameIds = await this.gameRepository.findIds(await this.readableGames(userId, roles));
    const inGames = QueryCriteria.in('gameId', gameIds);
    return alsoOwned ? QueryCriteria.anyOf([inGames, QueryCriteria.eq('owner', userId)]) : inGames;
  }
}
