import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { UpdateItemCarriedStatusCommand } from '../commands/update-item-carried-status.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';

@CommandHandler(UpdateItemCarriedStatusCommand)
export class UpdateItemCarriedStatusHandler implements ICommandHandler<UpdateItemCarriedStatusCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
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
