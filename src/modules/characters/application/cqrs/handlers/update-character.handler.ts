import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UpdateCharacterCommand } from '../commands/update-character.command';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(UpdateCharacterCommand)
export class UpdateCharacterHandler implements ICommandHandler<UpdateCharacterCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    character.update({
      name: command.name,
      weight: command.info?.weight,
      height: command.info?.height,
      age: command.roleplay?.age,
      gender: command.roleplay?.gender,
      description: command.description,
      imageUrl: command.imageUrl,
    });
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character);
    character.getUncommittedEvents().forEach((event) => this.characterEventBus.publish(event));
    return updated;
  }
}
