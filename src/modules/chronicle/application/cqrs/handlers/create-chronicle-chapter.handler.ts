import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { ChronicleChapter } from '../../../domain/aggregates/chronicle-chapter.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { CreateChronicleChapterCommand } from '../commands/chronicle-chapter.commands.js';

/** A new chapter at the end of the chronicle: the masters of the game, up to 200 chapters (spec 102). */
@CommandHandler(CreateChronicleChapterCommand)
export class CreateChronicleChapterHandler implements ICommandHandler<CreateChronicleChapterCommand, ChronicleChapter> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(command: CreateChronicleChapterCommand): Promise<ChronicleChapter> {
    GameAccess.checkCreateRole(command.roles, 'chronicle chapters');
    const level = await this.access.levelInExistingGame(command.gameId, command.userId, command.roles);
    this.access.checkWriteChronicle(level);
    ChronicleChapter.checkCanAdd(await this.repository.countByGameId(command.gameId));
    const chapter = ChronicleChapter.create({
      gameId: command.gameId,
      title: command.title,
      content: command.content,
      visibility: command.visibility,
      campaignDate: command.campaignDate,
      order: (await this.repository.maxOrder(command.gameId)) + 1,
      owner: command.userId,
    });
    return this.repository.save(chapter);
  }
}
