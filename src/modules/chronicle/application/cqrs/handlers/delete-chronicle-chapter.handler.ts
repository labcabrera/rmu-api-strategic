import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ChapterNotFoundError } from '../../../domain/errors/chronicle.errors.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { DeleteChronicleChapterCommand } from '../commands/chronicle-chapter.commands.js';

/**
 * Deletes a chapter: the masters. Its images stay, as they belong to the chronicle of the game and another chapter
 * may show them (spec 102, decision 4). The order of the others keeps a gap, which does not change how they sort.
 */
@CommandHandler(DeleteChronicleChapterCommand)
export class DeleteChronicleChapterHandler implements ICommandHandler<DeleteChronicleChapterCommand, void> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(command: DeleteChronicleChapterCommand): Promise<void> {
    const chapter = await this.repository.findById(command.chapterId);
    if (!chapter) throw new ChapterNotFoundError(command.chapterId);
    await this.access.checkWriteChapter(chapter, command.userId, command.roles);
    await this.repository.deleteById(chapter.id);
  }
}
