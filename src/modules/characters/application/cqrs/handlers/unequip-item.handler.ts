import { CharacterWriter } from '../../services/character-writer.service.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { UnequipItemCommand } from '../commands/unequip-item.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';

@CommandHandler(UnequipItemCommand)
export class UnequipItemHandler implements ICommandHandler<UnequipItemCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: UnequipItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const items = await this.itemRepository.findByCharacterId(characterId);
    const item = items.find(i => i.id === command.itemId);
    if (!item) throw new NotFoundError('Item', command.itemId);

    character.unequipItem(item.id);

    this.characterProcessorService.process(character, items);
    return await this.characterWriter.save(character);
  }
}
