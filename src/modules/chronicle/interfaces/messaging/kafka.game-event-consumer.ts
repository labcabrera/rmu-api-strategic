import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteChaptersByGameCommand } from '../../application/cqrs/commands/chronicle-chapter.commands.js';

/** The part of a game event this consumer reads. */
export interface GameDeletedPayload {
  data?: { id?: string };
}

/**
 * Deletes the chronicle of a deleted game and its images (workspace spec 102, decision 5). A deleted realm reaches here
 * too, since DeleteGamesByRealmHandler publishes a game.deleted per game.
 */
@Controller()
export class KafkaChronicleGameEventConsumer {
  private readonly logger = new Logger(KafkaChronicleGameEventConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  /** An error is logged with the game id and never rethrown, so it does not block the partition (spec 016, decision 8). */
  @EventPattern<string>('internal.rmu-strategic.game.deleted.v1')
  async onGameDeleted(@Payload() event: GameDeletedPayload, @Ctx() context: KafkaContext): Promise<void> {
    const topic = context.getTopic();
    const gameId = event?.data?.id;
    if (!gameId) {
      this.logger.error(`Game id not found in the event payload on ${topic}`);
      return;
    }
    try {
      await this.commandBus.execute(new DeleteChaptersByGameCommand(gameId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error deleting the chronicle of game ${gameId} (${topic}): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
