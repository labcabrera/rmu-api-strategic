import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ChronicleChapterVisibility } from '../../../domain/value-objects/chronicle-chapter-visibility.vo.js';

/** A new chapter, appended at the end of the chronicle of the game. */
export class CreateChronicleChapterCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly title: string,
    public readonly content: string | undefined,
    public readonly visibility: ChronicleChapterVisibility | undefined,
    public readonly campaignDate: number | null | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** undefined leaves a field as it is; a null campaignDate clears it. */
export class UpdateChronicleChapterCommand extends AuthenticatedCommand {
  constructor(
    public readonly chapterId: string,
    public readonly title: string | undefined,
    public readonly content: string | undefined,
    public readonly visibility: ChronicleChapterVisibility | undefined,
    public readonly campaignDate: number | null | undefined,
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {
    super(userId, roles);
  }
}

export class DeleteChronicleChapterCommand extends AuthenticatedCommand {
  constructor(
    public readonly chapterId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** The whole order of the chronicle of a game: every chapter, once. */
export class ReorderChronicleChaptersCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly ids: string[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/**
 * Deletes the chronicle of a deleted game and the images of its scope in rmu-api-media (spec 102, decision 5). A
 * system command: it comes from the game.deleted event, so it has no user and no access check.
 */
export class DeleteChaptersByGameCommand {
  constructor(public readonly gameId: string) {}
}
