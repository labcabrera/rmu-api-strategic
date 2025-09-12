import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/character.repository';
import { DeleteItemCommand } from '../commands/delete-item.command';
import { CharacterEquipment } from 'src/modules/characters/domain/value-objects/character-equipment.vo';

@CommandHandler(DeleteItemCommand)
export class DeleteItemCommandHandler implements ICommandHandler<DeleteItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: DeleteItemCommand): Promise<Character> {
    const { characterId, itemId } = command;
    const character = await this.characterRepository.findById(characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const item = character.items.find((item) => item.id === itemId);
    if (!item) {
      throw new NotFoundError('Character Item', itemId);
    }
    character.items = character.items.filter((item) => item.id !== itemId);
    this.cleanupEquipedItem(character.equipment, itemId);
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(characterId, character);
    return updated;
  }

  private cleanupEquipedItem(equipment: CharacterEquipment, deletedItemId: string): void {
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const slot of slots) {
      if (equipment[slot] === deletedItemId) {
        equipment[slot] = null;
      }
    }
  }
}
