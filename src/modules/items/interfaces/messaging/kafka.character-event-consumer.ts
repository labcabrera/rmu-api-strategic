import { Controller, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { CharacterDeletedEvent } from '../../../characters/domain/events/character.events';
import { DeleteItemCommand } from '../../application/cqrs/commands/delete-item.command';
import { type ItemRepository, ITEM_REPOSITORY } from '../../application/ports/item-repository.port';

/** Deletes the items of a deleted character. */
@Controller()
export class KafkaItemCharacterEventConsumer {
  private readonly logger = new Logger(KafkaItemCharacterEventConsumer.name);

  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @EventPattern<string>('internal.rmu-strategic.character.deleted.v1')
  async onCharacterDeleted(@Payload() event: CharacterDeletedEvent, @Ctx() context: KafkaContext) {
    const characterId = event.data.id;
    this.logger.log(`Received character deleted event on ${context.getTopic()} for character ${characterId}: ${event.data.name}`);
    const items = await this.itemRepository.findByCharacterId(event.data.id);
    const commands = items.map(item => new DeleteItemCommand(item.id, 'system', ['rmu-admin']));
    this.logger.log(`Deleting ${items.length} items for character ${characterId}`);
    await Promise.all(commands.map(command => this.commandBus.execute(command)));
  }
}
