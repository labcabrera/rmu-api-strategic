import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UpdateItemCarriedStatusCommand } from '../commands/update-item-carried-status.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, NotModifiedError, ValidationError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(UpdateItemCarriedStatusCommand)
export class UpdateItemCarriedStatusHandler implements ICommandHandler<UpdateItemCarriedStatusCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: UpdateItemCarriedStatusCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    throw new Error('Not implemented');

    // const item: CharacterItem = character.items.find((e) => e.id === command.itemId) as CharacterItem;
    // if (!item) throw new ValidationError(`Item not found: ${command.itemId}`);

    // if (item.carried === command.carried) throw new NotModifiedError(`Item carried status is already set to: ${command.carried}`);

    // if (command.carried === false) {
    //   for (const slot of ['mainHand', 'offHand', 'body', 'head', 'legs', 'arms']) {
    //     if (character.equipment[slot] == item.id) {
    //       character.equipment[slot] = undefined;
    //     }
    //   }
    // }
    // item.carried = command.carried;
    // this.characterProcessorService.process(character);
    // return await this.characterRepository.update(character.id, character);
  }
}
