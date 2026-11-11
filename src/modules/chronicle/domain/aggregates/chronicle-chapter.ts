import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { GameAccessLevel } from '../../../games/domain/value-objects/game-member.vo.js';
import { ChapterContentTooLongError, ChronicleChapterLimitError, ChronicleOrderInvalidError } from '../errors/chronicle.errors.js';
import {
  CHRONICLE_CHAPTER_VISIBILITIES,
  type ChronicleChapterVisibility,
  canReadVisibility,
  DEFAULT_CHRONICLE_CHAPTER_VISIBILITY,
  MAX_CHAPTER_CONTENT_LENGTH,
  MAX_CHAPTER_TITLE_LENGTH,
  MAX_CHRONICLE_CHAPTERS,
} from '../value-objects/chronicle-chapter-visibility.vo.js';

export interface ChronicleChapterProps {
  id: string;
  gameId: string;
  title: string;
  /** Markdown */
  content: string;
  visibility: ChronicleChapterVisibility;
  /** Position in the chronicle: the list is sorted by it. Changed only by the reorder (not by update()). */
  order: number;
  /** The day of the campaign calendar it happens on (GameCalendar.currentDay, 1 or more), if any. */
  campaignDate: number | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface CreateChronicleChapterProps {
  gameId: string;
  title: string;
  content?: string;
  visibility?: ChronicleChapterVisibility;
  order: number;
  campaignDate?: number | null;
  owner: string;
}

/** undefined leaves a field as it is; a null campaignDate clears it. */
export interface UpdateChronicleChapterProps {
  title?: string;
  content?: string;
  visibility?: ChronicleChapterVisibility;
  campaignDate?: number | null;
}

/**
 * A chapter of the chronicle of a strategic game (workspace spec 102): a Markdown text the members read and the masters
 * write. It publishes no domain events (decision 8).
 */
export class ChronicleChapter extends BaseAggregateRoot<ChronicleChapterProps> {
  private constructor(
    id: string,
    public readonly gameId: string,
    public title: string,
    public content: string,
    public visibility: ChronicleChapterVisibility,
    public readonly order: number,
    public campaignDate: number | undefined,
    public readonly owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public updatedBy: string,
  ) {
    super(id);
  }

  static create(props: CreateChronicleChapterProps): ChronicleChapter {
    const now = new Date();
    return new ChronicleChapter(
      randomUUID(),
      props.gameId,
      ChronicleChapter.checkTitle(props.title),
      ChronicleChapter.checkContent(props.content ?? ''),
      ChronicleChapter.checkVisibility(props.visibility ?? DEFAULT_CHRONICLE_CHAPTER_VISIBILITY),
      props.order,
      ChronicleChapter.checkCampaignDate(props.campaignDate),
      props.owner,
      now,
      now,
      props.owner,
    );
  }

  static fromProps(props: ChronicleChapterProps): ChronicleChapter {
    return new ChronicleChapter(
      props.id,
      props.gameId,
      props.title,
      props.content ?? '',
      props.visibility ?? DEFAULT_CHRONICLE_CHAPTER_VISIBILITY,
      props.order,
      props.campaignDate ?? undefined,
      props.owner,
      props.createdAt,
      props.updatedAt ?? props.createdAt,
      props.updatedBy ?? props.owner,
    );
  }

  /** Changes the given fields; the audit fields only move when something changed. */
  update(props: UpdateChronicleChapterProps, userId: string): void {
    if (props.title !== undefined) this.title = ChronicleChapter.checkTitle(props.title);
    if (props.content !== undefined) this.content = ChronicleChapter.checkContent(props.content);
    if (props.visibility !== undefined) this.visibility = ChronicleChapter.checkVisibility(props.visibility);
    if (props.campaignDate !== undefined) this.campaignDate = ChronicleChapter.checkCampaignDate(props.campaignDate);
    if (!this.hasChanges()) return;
    this.updatedAt = new Date();
    this.updatedBy = userId;
  }

  /** Whether a user with this level in the game reads the chapter (spec 102, decision 3). */
  isReadableAt(level: GameAccessLevel): boolean {
    return canReadVisibility(level, this.visibility);
  }

  /** A game has at most MAX_CHRONICLE_CHAPTERS chapters: `count` is how many it has before adding one. */
  static checkCanAdd(count: number): void {
    if (count >= MAX_CHRONICLE_CHAPTERS) throw new ChronicleChapterLimitError();
  }

  /** The new order must hold every chapter of the game exactly once (PUT /order). */
  static checkOrder(currentIds: string[], requestedIds: string[]): void {
    const requested = new Set(requestedIds);
    if (requested.size !== requestedIds.length) throw new ChronicleOrderInvalidError('The order repeats a chapter');
    const current = new Set(currentIds);
    const extra = requestedIds.filter(id => !current.has(id));
    if (extra.length > 0) throw new ChronicleOrderInvalidError(`Chapters not in the chronicle: ${extra.join(', ')}`);
    const missing = currentIds.filter(id => !requested.has(id));
    if (missing.length > 0) throw new ChronicleOrderInvalidError(`Chapters missing from the order: ${missing.join(', ')}`);
  }

  private static checkTitle(title: string): string {
    const trimmed = (title ?? '').trim();
    if (trimmed === '') throw new ValidationError('The title of a chapter can not be empty');
    if (trimmed.length > MAX_CHAPTER_TITLE_LENGTH) {
      throw new ValidationError(`The title of a chapter has more than ${MAX_CHAPTER_TITLE_LENGTH} characters`);
    }
    return trimmed;
  }

  private static checkContent(content: string): string {
    if (content.length > MAX_CHAPTER_CONTENT_LENGTH) throw new ChapterContentTooLongError(content.length);
    return content;
  }

  private static checkVisibility(visibility: ChronicleChapterVisibility): ChronicleChapterVisibility {
    if (!CHRONICLE_CHAPTER_VISIBILITIES.includes(visibility)) throw new ValidationError(`Unknown visibility ${String(visibility)}`);
    return visibility;
  }

  private static checkCampaignDate(campaignDate: number | null | undefined): number | undefined {
    if (campaignDate === null || campaignDate === undefined) return undefined;
    if (!Number.isInteger(campaignDate) || campaignDate < 1) {
      throw new ValidationError('The campaign date is a day of the campaign calendar: an integer of 1 or more');
    }
    return campaignDate;
  }

  getProps(): ChronicleChapterProps {
    return {
      id: this.id,
      gameId: this.gameId,
      title: this.title,
      content: this.content,
      visibility: this.visibility,
      order: this.order,
      campaignDate: this.campaignDate,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}

/** A chapter in the listing: everything but its content (spec 102, decision 8). */
export type ChronicleChapterSummary = Omit<ChronicleChapterProps, 'content'> & { version: number };
