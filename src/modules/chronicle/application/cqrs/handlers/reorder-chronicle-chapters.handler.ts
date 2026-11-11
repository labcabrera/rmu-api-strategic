import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ChronicleChapter } from '../../../domain/aggregates/chronicle-chapter.js';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { ChronicleAccess } from '../../services/chronicle-access.service.js';
import { ReorderChronicleChaptersCommand } from '../commands/chronicle-chapter.commands.js';

/**
 * The whole order of a chronicle (PUT /order): the masters, with every chapter of the game exactly once (400
 * `chronicle-order-invalid` otherwise). It does not move the version or the audit fields of the chapters, so it does
 * not turn the save of a master editing one of them into a conflict.
 */
@CommandHandler(ReorderChronicleChaptersCommand)
export class ReorderChronicleChaptersHandler implements ICommandHandler<ReorderChronicleChaptersCommand, void> {
  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    private readonly access: ChronicleAccess,
  ) {}

  async execute(command: ReorderChronicleChaptersCommand): Promise<void> {
    const level = await this.access.levelInExistingGame(command.gameId, command.userId, command.roles);
    this.access.checkWriteChronicle(level);
    const current = await this.repository.findIdsByGameId(command.gameId);
    ChronicleChapter.checkOrder(current, command.ids);
    await this.repository.updateOrder(command.gameId, command.ids);
  }
}
