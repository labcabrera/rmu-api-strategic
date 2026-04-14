import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { CharacterRaceUpdatedEvent } from './kafka.race-event-consumer';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateCharacterRaceCommand } from 'src/modules/characters/application/cqrs/commands/update-character-race.command';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import { CharacterDeletedEvent } from '../../domain/events/character.events';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { DeleteItemCommand } from 'src/modules/items/application/cqrs/commands/delete-item.command';

@Controller()
export class KafkaCharacterEventConsumer {
  private readonly logger = new Logger(KafkaCharacterEventConsumer.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @EventPattern('internal.rmu-strategic.character.race-updated.v1')
  async onHandleRace(@Payload() event: CharacterRaceUpdatedEvent, @Ctx() context: KafkaContext) {
    this.logger.log(`Received race updated event on ${context.getTopic()} for race ${event.data.id}: ${event.data.name}`);
    const command = UpdateCharacterRaceCommand.create(event.data);
    await this.commandBus.execute<UpdateCharacterRaceCommand, void>(command);
  }

  @EventPattern('internal.rmu-strategic.character.deleted.v1')
  async onCharacterDeleted(@Payload() event: CharacterDeletedEvent, @Ctx() context: KafkaContext) {
    const characterId = event.data.id;
    this.logger.log(`Received character deleted event on ${context.getTopic()} for character ${characterId}: ${event.data.name}`);
    const items = await this.itemRepository.findByCharacterId(event.data.id);
    const commands = items.map(item => new DeleteItemCommand(item.id, 'system', ['rmu-admin']));
    this.logger.log(`Deleting ${items.length} items for character ${characterId}`);
    await Promise.all(commands.map(command => this.commandBus.execute(command)));
  }
}
