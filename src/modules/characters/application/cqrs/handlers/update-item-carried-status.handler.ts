import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UpdateItemCarriedStatusCommand } from '../commands/update-item-carried-status.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(UpdateItemCarriedStatusCommand)
export class UpdateItemCarriedStatusHandler implements ICommandHandler<UpdateItemCarriedStatusCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: UpdateItemCarriedStatusCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const item = await this.itemRepository.findById(command.itemId);
    if (!item) throw new ValidationError(`Item with id ${command.itemId} not found`);

    if (command.carried === false) {
      for (const slot of Object.keys(character.equipment.slots) as Array<keyof typeof character.equipment.slots>) {
        if (character.equipment.slots[slot] === item.id) {
          character.equipment.slots[slot] = null;
        }
      }
    }

    await this.itemRepository.updateCarriedStatus(item.id, command.carried);
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    return await this.characterRepository.update(character.id, character);
  }
}
