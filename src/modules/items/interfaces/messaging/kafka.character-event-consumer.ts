import { Controller, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { CharacterDeletedEvent } from '../../../characters/domain/events/character.events.js';
import { RMU_ADMIN } from '../../../shared/domain/entities/user-roles.js';
import { DeleteItemCommand } from '../../application/cqrs/commands/delete-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../application/ports/item-repository.port.js';

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
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.logger.log(`Deleting ${items.length} items for character ${characterId}`);
    // The character is already gone, and DeleteItemHandler does not need it (F-strategic-22). One at a time: each delete
    // may write the same character, which would be a version-conflict in parallel (F-strategic-23).
    for (const item of items) {
      await this.commandBus.execute(new DeleteItemCommand(item.id, 'system', [RMU_ADMIN]));
    }
  }
}
