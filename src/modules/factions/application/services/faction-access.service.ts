import { Inject, Injectable } from '@nestjs/common';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import type { Game } from '../../../games/domain/aggregates/game.js';
import { type GameAccessLevel, gameAccessAtLeast } from '../../../games/domain/value-objects/game-member.vo.js';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import type { Faction } from '../../domain/aggregates/faction.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../ports/faction-repository.port.js';

/**
 * What a user can do with a faction, a character or an item of a strategic game (spec 072, contract 18):
 * - manage: the masters of the game (owner, masters, admins);
 * - write: the players of the faction (decision 6), while they are players of the game;
 * - read: the other members of the game (players and spectators read everything, decisions 3 and 4) and the owner of
 *   a character after leaving the game (spec 071, decision 5); other APIs read everything;
 * - none: anybody else.
 */
export type EntityAccess = 'manage' | 'write' | 'read' | 'none';

/** What the access to a character needs. */
export interface ViewedCharacter {
  owner: string;
  gameId: string;
  faction: { id: string };
}

/**
 * The access of one user to factions and characters, with the games and the factions read once (a listing asks for
 * many).
 */
export class StrategicViewer {
  private readonly games = new Map<string, Promise<Game | null>>();
  private readonly factions = new Map<string, Promise<Faction | null>>();

  constructor(
    private readonly gameAccess: GameAccess,
    private readonly factionRepository: FactionRepository,
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

  factionById(factionId: string): Promise<Faction | null> {
    let faction = this.factions.get(factionId);
    if (!faction) {
      faction = this.factionRepository.findById(factionId);
      this.factions.set(factionId, faction);
    }
    return faction;
  }

  async gameLevel(gameId: string): Promise<GameAccessLevel> {
    return this.gameAccess.level(await this.game(gameId), this.userId, this.roles);
  }

  /** The access to a faction: `players` give `write` while they are players of the game. */
  async faction(faction: Faction): Promise<EntityAccess> {
    return StrategicViewer.byLevel(await this.gameLevel(faction.gameId), faction.isPlayer(this.userId));
  }

  /** A character follows its faction; its owner still reads it after leaving the game. */
  async character(character: ViewedCharacter): Promise<EntityAccess> {
    const level = await this.gameLevel(character.gameId);
    const faction =
      gameAccessAtLeast(level, 'player') && level !== 'master' && level !== 'owner' ? await this.factionById(character.faction.id) : null;
    const access = StrategicViewer.byLevel(level, !!faction?.isPlayer(this.userId));
    if (access === 'none' && character.owner === this.userId) return 'read';
    return access;
  }

  static byLevel(level: GameAccessLevel, factionPlayer: boolean): EntityAccess {
    if (gameAccessAtLeast(level, 'master')) return 'manage';
    if (level === 'player' && factionPlayer) return 'write';
    if (gameAccessAtLeast(level, 'spectator')) return 'read';
    return 'none';
  }
}

export const canWrite = (access: EntityAccess) => access === 'manage' || access === 'write';

/**
 * Who reads and changes a faction (spec 072):
 * - everything of it (gold, NPCs, armory): every member of the game;
 * - its gold, armory, market and description: its players and the masters (decision 6);
 * - add-gold, NPCs, its players, creating and deleting it: the masters (GameAccess.checkManage), and its players add
 *   their friends to it (decision 5).
 */
@Injectable()
export class FactionAccess {
  constructor(
    private readonly gameAccess: GameAccess,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
  ) {}

  viewer(userId: string, roles: string[]): StrategicViewer {
    return new StrategicViewer(this.gameAccess, this.factionRepository, userId, roles);
  }

  access(faction: Faction, userId: string, roles: string[]): Promise<EntityAccess> {
    return this.viewer(userId, roles).faction(faction);
  }

  async checkRead(faction: Faction, userId: string, roles: string[]): Promise<void> {
    if ((await this.access(faction, userId, roles)) !== 'none') return;
    throw new ForbiddenError('You do not have permission to read this faction');
  }

  /** Its gold, its armory and the market for it: the masters and its players (decision 6). */
  async canWrite(faction: Faction, userId: string, roles: string[]): Promise<boolean> {
    return canWrite(await this.access(faction, userId, roles));
  }

  async checkWrite(faction: Faction, userId: string, roles: string[]): Promise<void> {
    if (await this.canWrite(faction, userId, roles)) return;
    throw new ForbiddenError('Only the players of the faction and the masters change it', 'not-a-faction-player');
  }
}
