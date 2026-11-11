import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ChronicleChapter } from '../../../domain/aggregates/chronicle-chapter.js';
import { ChapterNotFoundError } from '../../../domain/errors/chronicle.errors.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { UpdateChronicleChapterCommand } from '../commands/chronicle-chapter.commands.js';

/** Title, content, visibility and campaign date of a chapter: the masters (spec 102, decision 7: 409 when stale). */
@CommandHandler(UpdateChronicleChapterCommand)
export class UpdateChronicleChapterHandler implements ICommandHandler<UpdateChronicleChapterCommand, ChronicleChapter> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(command: UpdateChronicleChapterCommand): Promise<ChronicleChapter> {
    const chapter = await this.repository.findById(command.chapterId);
    if (!chapter) throw new ChapterNotFoundError(command.chapterId);
    await this.access.checkWriteChapter(chapter, command.userId, command.roles);
    chapter.checkVersion(command.expectedVersion);
    chapter.update(
      { title: command.title, content: command.content, visibility: command.visibility, campaignDate: command.campaignDate },
      command.userId,
    );
    // Spec 021, decision 9: a PATCH without changes does not write.
    if (!chapter.hasChanges()) return chapter;
    return this.repository.update(chapter);
  }
}
