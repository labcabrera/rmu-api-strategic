import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { UpdateTemporaryStatCommand } from '../commands/update-temporary-stat.command';

@CommandHandler(UpdateTemporaryStatCommand)
export class UpdateTemporaryStatHandler implements ICommandHandler<UpdateTemporaryStatCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: UpdateTemporaryStatCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', command.characterId);

    const stat = character.statistics[command.stat];
    if (!stat) {
      throw new ValidationError(`Stat ${command.stat} not found for character ${command.characterId}`);
    }

    const temporary = character.statistics[command.stat].temporary;
    const potential = character.statistics[command.stat].potential;
    const newTemporary = Math.min(potential, temporary + command.value);

    character.statistics[command.stat].temporary = newTemporary;

    const items = await this.itemRepository.findByCharacterId(command.characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return character;
  }
}
