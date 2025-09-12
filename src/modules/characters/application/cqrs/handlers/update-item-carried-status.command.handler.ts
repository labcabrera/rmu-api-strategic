import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CharacterItem } from 'src/modules/characters/domain/entities/character-item.entity';
import { NotFoundError, NotModifiedError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/out/character.repository';
import { UpdateItemCarriedStatusCommand } from '../commands/update-item-carried-status.command';

@CommandHandler(UpdateItemCarriedStatusCommand)
export class UpdateItemCarriedStatusCommandHandler implements ICommandHandler<UpdateItemCarriedStatusCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
  ) {}

  async execute(command: UpdateItemCarriedStatusCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const item: CharacterItem = character.items.find((e) => e.id === command.itemId) as CharacterItem;
    if (!item) {
      throw new ValidationError(`Item not found: ${command.itemId}`);
    }
    if (item.carried === command.carried) {
      throw new NotModifiedError(`Item carried status is already set to: ${command.carried}`);
    }
    if (command.carried === false) {
      for (const slot of ['mainHand', 'offHand', 'body', 'head', 'legs', 'arms']) {
        if (character.equipment[slot] == item.id) {
          character.equipment[slot] = undefined;
        }
      }
    }
    item.carried = command.carried;
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(command.characterId, character);
  }
}
