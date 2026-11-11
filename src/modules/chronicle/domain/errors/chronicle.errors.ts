import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { MAX_CHAPTER_CONTENT_LENGTH, MAX_CHRONICLE_CHAPTERS } from '../value-objects/chronicle-chapter-visibility.vo.js';

/** A missing chapter, or a private one the user cannot read (spec 102, decision 3: a 404, not a 403). */
export class ChapterNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Chronicle chapter', id, 'chapter-not-found');
    Object.setPrototypeOf(this, ChapterNotFoundError.prototype);
  }
}

export class ChronicleChapterLimitError extends ConflictError {
  constructor() {
    super(`A chronicle has at most ${MAX_CHRONICLE_CHAPTERS} chapters`, 'chronicle-chapter-limit');
    Object.setPrototypeOf(this, ChronicleChapterLimitError.prototype);
  }
}

export class ChapterContentTooLongError extends ValidationError {
  constructor(length: number) {
    super(`The content has ${length} characters, more than ${MAX_CHAPTER_CONTENT_LENGTH}`, 'chapter-content-too-long', {
      maxLength: MAX_CHAPTER_CONTENT_LENGTH,
    });
    Object.setPrototypeOf(this, ChapterContentTooLongError.prototype);
  }
}

/** PUT /order with ids missing, extra or repeated. */
export class ChronicleOrderInvalidError extends ValidationError {
  constructor(message: string) {
    super(message, 'chronicle-order-invalid');
    Object.setPrototypeOf(this, ChronicleOrderInvalidError.prototype);
  }
}
