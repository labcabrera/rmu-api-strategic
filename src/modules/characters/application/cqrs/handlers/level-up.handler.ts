import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelUpCommand } from '../commands/level-up.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(LevelUpCommand)
export class LevelUpHandler implements ICommandHandler<LevelUpCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: LevelUpCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    character.levelUp(command.force);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return updated;
  }
}
