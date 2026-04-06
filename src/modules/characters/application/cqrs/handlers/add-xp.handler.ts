import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { AddXPCommand } from '../commands/add-xp.command';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { CharacterRepository } from '../../ports/character.repository';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(AddXPCommand)
export class AddXPHandler implements ICommandHandler<AddXPCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
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
