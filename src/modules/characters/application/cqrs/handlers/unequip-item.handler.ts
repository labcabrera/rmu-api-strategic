import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { EquipItemCommand } from '../commands/equip-item-command';
import { UnequipItemCommand } from '../commands/unequip-item-command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, NotModifiedError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(UnequipItemCommand)
export class UnequipItemHandler implements ICommandHandler<UnequipItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    if (!character.equipment[command.slot]) {
      throw new NotModifiedError(`No item equipped in slot ${command.slot}`);
    }
    character.equipment[command.slot] = undefined;
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(character);
  }
}
