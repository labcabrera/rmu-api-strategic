import { type GameAccessLevel, gameAccessAtLeast } from '../../../games/domain/value-objects/game-member.vo.js';

/**
 * Who reads a chapter of the chronicle (workspace spec 102, decision 3): `public` the members of the game (spectators
 * and up), `master` only the owner and the masters of the game.
 */
export const CHRONICLE_CHAPTER_VISIBILITIES = ['public', 'master'] as const;
export type ChronicleChapterVisibility = (typeof CHRONICLE_CHAPTER_VISIBILITIES)[number];
export const DEFAULT_CHRONICLE_CHAPTER_VISIBILITY: ChronicleChapterVisibility = 'public';

/** Spec 102, decision 2. */
export const MAX_CHRONICLE_CHAPTERS = 200;
export const MAX_CHAPTER_TITLE_LENGTH = 200;
export const MAX_CHAPTER_CONTENT_LENGTH = 200_000;

/** The game access level a user needs to read a chapter of this visibility. */
export const readLevelOf = (visibility: ChronicleChapterVisibility): GameAccessLevel => (visibility === 'master' ? 'master' : 'spectator');

/** Whether a user with this level in the game reads chapters of this visibility. */
export const canReadVisibility = (level: GameAccessLevel, visibility: ChronicleChapterVisibility): boolean =>
  gameAccessAtLeast(level, readLevelOf(visibility));

/** The owner, the masters and the admins write the chronicle (spec 102, decision 3). */
export const canWriteChronicle = (level: GameAccessLevel): boolean => gameAccessAtLeast(level, 'master');
