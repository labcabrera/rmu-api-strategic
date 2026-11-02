import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteCharactersByGameCommand } from '../../application/cqrs/commands/delete-characters-by-game.command.js';

/** The part of a game event this consumer reads. */
export interface GameDeletedPayload {
  data?: { id?: string };
}

/**
 * Deletes the characters of a deleted game (spec 044): a game is the container of its characters. A deleted realm
 * reaches here too, since DeleteGamesByRealmHandler publishes a game.deleted per game.
 */
@Controller()
export class KafkaCharacterGameEventConsumer {
  private readonly logger = new Logger(KafkaCharacterGameEventConsumer.name);

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
      await this.commandBus.execute(new DeleteCharactersByGameCommand(gameId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error deleting the characters of game ${gameId} (${topic}): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
