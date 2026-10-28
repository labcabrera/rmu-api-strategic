import { CharacterWriter } from '../../services/character-writer.service.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { UpdateItemCarriedStatusCommand } from '../commands/update-item-carried-status.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { ItemUpdatedEvent } from '../../../../items/domain/events/item.events.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateItemCarriedStatusCommand)
export class UpdateItemCarriedStatusHandler implements ICommandHandler<UpdateItemCarriedStatusCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly characterWriter: CharacterWriter,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: UpdateItemCarriedStatusCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const item = await this.itemRepository.findById(command.itemId);
    if (!item) throw new ValidationError(`Item with id ${command.itemId} not found`);
    // Spec 023, decision 16: only the items the character holds
    if (item.characterId !== character.id) {
      throw new ValidationError('The item does not belong to the character', 'err-item-other-holder');
    }

    if (command.carried === false) {
      for (const slot of Object.keys(character.equipment.slots) as Array<keyof typeof character.equipment.slots>) {
        if (character.equipment.slots[slot] === item.id) {
          character.equipment.slots[slot] = null;
        }
      }
    }

    // item.updated tells the consumers of the item (F-strategic-28); an unchanged item is neither written nor published
    if (item.carried !== command.carried) {
      const updated = await this.itemRepository.updateCarriedStatus(item.id, command.carried);
      await this.events.publish('item', new ItemUpdatedEvent(updated.getProps()));
    }
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    return await this.characterWriter.save(character);
  }
}
