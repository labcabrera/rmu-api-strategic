import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { RenameGameUserCommand } from '../../application/cqrs/commands/rename-game-user.command.js';

/** The part of a users event this consumer reads. */
export interface UserUpdatedPayload {
  data?: { id?: unknown; name?: unknown };
}

/**
 * Keeps the copy of the name of a user in the members and join requests of games. Most updates of a user do not change it, and write nothing. An error
 * is logged and never rethrown, so that it cannot block the partition: the next update of the user repeats the write.
 */
@Controller()
export class KafkaUserEventConsumer {
  private readonly logger = new Logger(KafkaUserEventConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern<string>('internal.rmu-users.user.updated.v1')
  async handleUserUpdated(@Payload() event: UserUpdatedPayload, @Ctx() context: KafkaContext): Promise<void> {
    const topic = context.getTopic();
    const { id, name } = event?.data ?? {};
    if (typeof id !== 'string' || typeof name !== 'string') {
      this.logger.error(`User id or name not found in the event payload on ${topic}`);
      return;
    }
    try {
      await this.commandBus.execute(new RenameGameUserCommand(id, name));
    } catch (error) {
      this.logger.error(`Could not rename user ${id} (${topic}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
