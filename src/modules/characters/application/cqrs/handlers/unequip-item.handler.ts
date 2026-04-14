import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UnequipItemCommand } from '../commands/unequip-item-command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(UnequipItemCommand)
export class UnequipItemHandler implements ICommandHandler<UnequipItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: UnequipItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const items = await this.itemRepository.findByCharacterId(characterId);
    const item = items.find(i => i.id === command.itemId);
    if (!item) throw new NotFoundError('Item', command.itemId);

    character.unequipItem(item.id);

    this.characterProcessorService.process(character, items);
    return await this.characterRepository.update(character.id, character);
  }
}
