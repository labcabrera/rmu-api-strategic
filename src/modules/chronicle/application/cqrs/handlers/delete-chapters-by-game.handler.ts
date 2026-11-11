import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ChronicleChapterRepository, CHRONICLE_CHAPTER_REPOSITORY } from '../../ports/chronicle-chapter-repository.port.js';
import { chronicleImageScope, MEDIA_CLIENT, type MediaClientPort } from '../../ports/media-client.port.js';
import { DeleteChaptersByGameCommand } from '../commands/chronicle-chapter.commands.js';

/**
 * Deletes the chronicle of a deleted game, then the images of its scope in rmu-api-media (spec 102, decision 5).
 * When media fails the error is logged with the game id and not retried (spec 016, decision 8): the images keep
 * their scope and can be deleted by hand. Idempotent.
 */
@CommandHandler(DeleteChaptersByGameCommand)
export class DeleteChaptersByGameHandler implements ICommandHandler<DeleteChaptersByGameCommand, void> {
  private readonly logger = new Logger(DeleteChaptersByGameHandler.name);

  constructor(
    @Inject(CHRONICLE_CHAPTER_REPOSITORY) private readonly repository: ChronicleChapterRepository,
    @Inject(MEDIA_CLIENT) private readonly mediaClient: MediaClientPort,
  ) {}

  async execute(command: DeleteChaptersByGameCommand): Promise<void> {
    const deleted = await this.repository.deleteByGameId(command.gameId);
    this.logger.log(`Deleted ${deleted} chronicle chapters of game ${command.gameId}`);
    const scope = chronicleImageScope(command.gameId);
    try {
      const images = await this.mediaClient.deleteImagesByScope(scope);
      this.logger.log(`Deleted ${images} chronicle images of game ${command.gameId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting the chronicle images of game ${command.gameId} (${scope}): ${message}`);
    }
  }
}
