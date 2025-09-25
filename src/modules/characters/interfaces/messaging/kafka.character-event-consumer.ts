import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import type { CharacterRepository } from '../../application/ports/character.repository';
import { CharacterRaceUpdatedEvent } from './kafka.race-event-consumer';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateCharacterRaceCommand } from '../../application/cqrs/commands/update-character-race.command';

@Controller()
export class KafkaCharacterEventConsumer {
  private readonly logger = new Logger(KafkaCharacterEventConsumer.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @EventPattern('internal.rmu-strategic.character.race-updated.v1')
  async handleRaceUpdated(@Payload() event: CharacterRaceUpdatedEvent, @Ctx() context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}: ${JSON.stringify(event)}`);
    const command = UpdateCharacterRaceCommand.create(event.data);
    await this.commandBus.execute<UpdateCharacterRaceCommand, void>(command);
  }
}
