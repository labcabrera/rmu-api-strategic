import { Injectable } from '@nestjs/common';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { type GameAccessLevel, gameAccessAtLeast } from '../../../games/domain/value-objects/game-member.vo.js';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors/errors.js';
import type { ChronicleChapter } from '../../domain/aggregates/chronicle-chapter.js';
import { ChapterNotFoundError } from '../../domain/errors/chronicle.errors.js';
import { canWriteChronicle } from '../../domain/value-objects/chronicle-chapter-visibility.vo.js';

/**
 * Who reads and writes the chronicle of a game (workspace spec 102, decision 3), by the level of the user in the game
 * (GameAccess.level):
 * - public chapters: spectators and up (owner, masters, players, spectators; admins and other APIs too);
 * - private chapters and every write: the owner, the masters and the admins;
 * - a private chapter is a 404 `chapter-not-found` for anyone below master, whatever they ask, so it is not revealed;
 * - anything else below the level needed is a 403 `forbidden`: `cover` (the card of a public game) and outsiders see
 *   no chronicle at all.
 */
@Injectable()
export class ChronicleAccess {
  constructor(private readonly gameAccess: GameAccess) {}

  async level(gameId: string, userId: string, roles: string[]): Promise<GameAccessLevel> {
    return this.gameAccess.level(await this.gameAccess.findGame(gameId), userId, roles);
  }

  /** The level of a user in an existing game: a missing game is a 404 (as the time log of the game). */
  async levelInExistingGame(gameId: string, userId: string, roles: string[]): Promise<GameAccessLevel> {
    const game = await this.gameAccess.findGame(gameId);
    if (!game) throw new NotFoundError('Strategic game', gameId);
    return this.gameAccess.level(game, userId, roles);
  }

  /** The chronicle of a game: spectators and up. */
  checkReadChronicle(level: GameAccessLevel): void {
    if (!gameAccessAtLeast(level, 'spectator')) throw new ForbiddenError('You do not have permission to read the chronicle of this game');
  }

  /** Creating and reordering: the masters. */
  checkWriteChronicle(level: GameAccessLevel): void {
    if (!canWriteChronicle(level)) throw new ForbiddenError('Only the masters of the game write its chronicle');
  }

  /** Reading one chapter: a private one is a 404 below master. */
  async checkReadChapter(chapter: ChronicleChapter, userId: string, roles: string[]): Promise<GameAccessLevel> {
    const level = await this.level(chapter.gameId, userId, roles);
    this.hidePrivate(chapter, level);
    this.checkReadChronicle(level);
    return level;
  }

  /** Changing or deleting one chapter: the masters; a private one is a 404 below master. */
  async checkWriteChapter(chapter: ChronicleChapter, userId: string, roles: string[]): Promise<void> {
    const level = await this.level(chapter.gameId, userId, roles);
    this.hidePrivate(chapter, level);
    this.checkWriteChronicle(level);
  }

  private hidePrivate(chapter: ChronicleChapter, level: GameAccessLevel): void {
    if (chapter.visibility === 'master' && !chapter.isReadableAt(level)) throw new ChapterNotFoundError(chapter.id);
  }
}
