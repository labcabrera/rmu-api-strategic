import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { AddXPCommand } from '../commands/add-xp.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';

@CommandHandler(AddXPCommand)
export class AddXPHandler implements ICommandHandler<AddXPCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: AddXPCommand): Promise<Character> {
    //TODO check admin role
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    const items = await this.itemRepository.findByCharacterId(character.id);
    character.experience.xp += command.xp;
    this.characterProcessorService.process(character, items);
    return await this.characterRepository.update(character.id, character);
  }
}
