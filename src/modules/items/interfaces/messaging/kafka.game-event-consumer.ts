import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteItemsByGameCommand } from '../../application/cqrs/commands/delete-items-by-game.command.js';

/** The part of a game event this consumer reads. */
export interface GameDeletedPayload {
  data?: { id?: string };
}

/**
 * Deletes the items of a deleted game (F-strategic-02, spec 044). It listens to game.deleted rather than realm.deleted:
 * items only know their game, and the games of a realm are deleted by another realm.deleted handler that runs at the
 * same time, so they may be gone before this one could look them up. DeleteGamesByRealmHandler publishes a
 * game.deleted per game, so a deleted realm reaches here too.
 */
@Controller()
export class KafkaItemGameEventConsumer {
  private readonly logger = new Logger(KafkaItemGameEventConsumer.name);

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
    this.logger.log(`Received game deleted event on ${topic} for game ${gameId}`);
    try {
      await this.commandBus.execute(new DeleteItemsByGameCommand(gameId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error deleting the items of game ${gameId} (${topic}): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
