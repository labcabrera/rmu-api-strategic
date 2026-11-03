import { Inject, Injectable } from '@nestjs/common';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import type { Game } from '../../../games/domain/aggregates/game.js';
import { type GameAccessLevel, gameAccessAtLeast } from '../../../games/domain/value-objects/game-member.vo.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import type { Faction } from '../../domain/aggregates/faction.js';
import { type FactionMembershipPort, FACTION_MEMBERSHIP } from '../ports/faction-membership.port.js';

/** What a user sees of a faction (spec 071, decision 12): all of it, its cover, or nothing. */
export type FactionView = 'full' | 'cover' | 'none';
/** What a user sees of a character (spec 071, decision 11): the sheet, the summary, or nothing. */
export type CharacterView = 'full' | 'summary' | 'none';

/** What the views of a character need. */
export interface ViewedCharacter {
  owner: string;
  gameId: string;
  faction: { id: string };
}

/**
 * The views of one user over factions and characters, with the games and the factions they are a member of read once
 * (a listing asks for many). Admins and other APIs see everything.
 */
export class StrategicViewer {
  private readonly games = new Map<string, Promise<Game | null>>();
  private memberFactions: Promise<Set<string>> | undefined;

  constructor(
    private readonly gameAccess: GameAccess,
    private readonly membership: FactionMembershipPort,
    readonly userId: string,
    readonly roles: string[],
  ) {}

  game(gameId: string): Promise<Game | null> {
    let game = this.games.get(gameId);
    if (!game) {
      game = this.gameAccess.findGame(gameId);
      this.games.set(gameId, game);
    }
    return game;
  }

  async gameLevel(gameId: string): Promise<GameAccessLevel> {
    return this.gameAccess.level(await this.game(gameId), this.userId, this.roles);
  }

  /** The factions the user leads or has a character in, in the games they are a member of. */
  isFactionMember(factionId: string): Promise<boolean> {
    this.memberFactions ??= this.gameAccess
      .memberGameIds(this.userId)
      .then(gameIds => this.membership.memberFactionIds(this.userId, gameIds))
      .then(ids => new Set(ids));
    return this.memberFactions.then(ids => ids.has(factionId));
  }

  async faction(faction: Faction): Promise<FactionView> {
    if (GameAccess.readsAll(this.roles)) return 'full';
    const level = await this.gameLevel(faction.gameId);
    if (gameAccessAtLeast(level, 'master')) return 'full';
    if (!gameAccessAtLeast(level, 'spectator')) return 'none';
    if (faction.leaderId === this.userId || (await this.isFactionMember(faction.id))) return 'full';
    return 'cover';
  }

  async character(character: ViewedCharacter): Promise<CharacterView> {
    // Its owner always reads it, also after leaving the game (decision 5).
    if (GameAccess.readsAll(this.roles) || character.owner === this.userId) return 'full';
    const level = await this.gameLevel(character.gameId);
    if (gameAccessAtLeast(level, 'master')) return 'full';
    if (!gameAccessAtLeast(level, 'spectator')) return 'none';
    return (await this.isFactionMember(character.faction.id)) ? 'full' : 'summary';
  }
}

/**
 * Who sees and uses a faction (spec 071):
 * - all of it (gold, NPCs, armory): masters, admins, other APIs and the members of the faction (its leader and the
 *   players with a character in it); the other readers of the game see its cover;
 * - its gold and the market for it: the masters and its leader while they are a player (decision 9);
 * - add-gold, NPCs, the faction itself: the masters (GameAccess.checkManage).
 */
@Injectable()
export class FactionAccess {
  constructor(
    private readonly gameAccess: GameAccess,
    @Inject(FACTION_MEMBERSHIP) private readonly membership: FactionMembershipPort,
  ) {}

  viewer(userId: string, roles: string[]): StrategicViewer {
    return new StrategicViewer(this.gameAccess, this.membership, userId, roles);
  }

  /** The factions the user leads or has a character in, in the games they are a member of. */
  async memberFactionIds(userId: string): Promise<string[]> {
    return this.membership.memberFactionIds(userId, await this.gameAccess.memberGameIds(userId));
  }

  async checkFullRead(faction: Faction, userId: string, roles: string[]): Promise<void> {
    if ((await this.viewer(userId, roles).faction(faction)) === 'full') return;
    throw new ForbiddenError('You do not have permission to read this faction');
  }

  /** Its gold and its armory: the masters, or its leader while a player of the game. */
  async canSpend(faction: Faction, userId: string, roles: string[]): Promise<boolean> {
    const game = await this.gameAccess.findGame(faction.gameId);
    if (this.gameAccess.canManage(game, userId, roles)) return true;
    return faction.leaderId === userId && this.gameAccess.isPlayer(game, userId, roles);
  }
}
